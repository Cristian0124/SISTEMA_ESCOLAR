import { pool } from "../config/database";
import type { Curso } from "./cursos.repository";
import { validarArrendamiento, confirmarSolicitud, type ContextoSolicitud } from "./solicitudes.repository";
import { HttpError } from "../types/http-error";

interface Matricula {
  id: number;
  curso: Curso;
  estado: string;
  fecha: Date;
}

export interface MatriculaAdministrativa {
  id: number;
  usuarioId: number;
  nombreEstudiante: string;
  correoEstudiante: string;
  curso: Curso;
  estado: string;
  fecha: Date;
  periodo: string;
}

export interface EstudianteMatriculado {
  id: number;
  nombre: string;
  cedula: string;
  nota: number | null;
  corte1: number | null;
  corte2: number | null;
  corte3: number | null;
}

export async function crearMatricula(
  usuarioId: number,
  curso: Curso,
  contexto?: ContextoSolicitud
): Promise<{ creada: boolean; matricula: Matricula }> {
  const cliente = await pool.connect();

  try {
    // Agrupa en una transacción la validación y el registro de la matrícula.
    await cliente.query("BEGIN");
    await cliente.query("SET LOCAL statement_timeout = '15s'");
    if (contexto) await validarArrendamiento(cliente, contexto);

    // Serializa las inscripciones del mismo curso.
    // Evita que dos solicitudes ocupen el último cupo a la vez.
    await cliente.query(
      "SELECT pg_advisory_xact_lock($1::integer, $2::integer)",
      [20261017, curso.id]
    );

    // Busca si el estudiante $1 ya tiene ese curso $2 en el periodo actual.
    // Si existe, COMMIT cierra la transacción y se devuelve la matrícula previa con creada: false.
    const existente = await cliente.query<Matricula>(
      `SELECT id, curso, estado, fecha
       FROM matriculas
       WHERE usuario_id = $1 AND curso_id = $2
         AND periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END`,
      [usuarioId, curso.id]
    );

    const matriculaExistente = existente.rows[0];

    if (matriculaExistente) {
      if (contexto) await confirmarSolicitud(cliente, contexto, matriculaExistente.id);
      await cliente.query("COMMIT");

      return {
        creada: false,
        matricula: matriculaExistente
      };
    }

    // Serializa las matrículas del estudiante para que las solicitudes paralelas
    // no permitan superar su cupo de créditos.
    const estudiante = (await cliente.query<{ activo:boolean; rol:string }>("SELECT activo,rol FROM usuarios WHERE id = $1 FOR UPDATE", [usuarioId])).rows[0];
    if (!estudiante?.activo || estudiante.rol !== "estudiante") throw new HttpError(403,"ESTUDIANTE_INACTIVO","La cuenta del estudiante no está activa.");
    // JOIN identifica la materia de cada curso activo del estudiante $1.
    // El código de materia $2 permite detectar otro grupo de la misma asignatura.
    const mismaMateria = await cliente.query(`SELECT 1 FROM matriculas m
      JOIN cursos c ON c.id = m.curso_id
      WHERE m.usuario_id = $1 AND c.codigo_pensum = $2 AND m.estado = 'Activa'
        AND m.periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END
      LIMIT 1`, [usuarioId, curso.codigoPensum]);
    if (mismaMateria.rowCount) {
      throw new HttpError(409, "ASIGNATURA_YA_MATRICULADA", "Ya tienes matriculado otro grupo de esta asignatura en el periodo vigente");
    }
    // Busca la materia $2 en el plan del estudiante $1. Recupera los créditos y el semestre de su carrera.
    const { rows: [plan] } = await cliente.query<{ carrera_codigo: string; semestre: number; creditos: number }>(
      'SELECT carrera_codigo, semestre, creditos FROM plan_del_estudiante($1) WHERE codigo = $2',
      [usuarioId, curso.codigoPensum]
    );
    if (!plan) {
      throw new HttpError(409, "CURSO_OTRA_CARRERA", "El curso no pertenece al pensum de tu carrera");
    }
    curso = { ...curso, semestre: plan.semestre, creditos: plan.creditos };
    // WITH separa el cálculo de créditos del estudiante $1.
    // nivel estima el semestre a partir de las materias aprobadas y lo limita al último del plan.
    // base suma los créditos del semestre, extra los aprobados para el periodo y usados los ya matriculados.
    // CROSS JOIN reúne los totales. El código compara los usados más los del curso con el límite.
    const balance = await cliente.query<{ creditosPermitidos: number; creditosUsados: number }>(
      `WITH nivel AS (
         SELECT LEAST(COALESCE((
           SELECT MAX(materia.semestre)::integer + 1
           FROM calificaciones AS calificacion
           JOIN plan_del_estudiante($1) AS materia ON materia.codigo = calificacion.codigo_materia
           WHERE calificacion.usuario_id = $1 AND calificacion.nota >= 3.0
         ), 1), (SELECT COALESCE(MAX(semestre), 1) FROM plan_del_estudiante($1)))::integer AS semestre
       ), base AS (
         SELECT COALESCE(SUM(creditos), 0)::integer AS creditos
         FROM plan_del_estudiante($1) WHERE semestre = (SELECT semestre FROM nivel)
       ), extra AS (
         SELECT COALESCE(SUM(creditos), 0)::integer AS creditos
         FROM solicitudes_creditos
         WHERE usuario_id = $1
           AND periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END
           AND estado = 'Aprobada'
       ), usados AS (
         SELECT COALESCE(SUM(materia.creditos), 0)::integer AS creditos
         FROM matriculas AS matricula
         JOIN cursos AS curso ON curso.id = matricula.curso_id
         JOIN plan_del_estudiante($1) AS materia ON materia.codigo = curso.codigo_pensum
         WHERE matricula.usuario_id = $1 AND matricula.estado = 'Activa'
           AND matricula.periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END
       )
       SELECT base.creditos + extra.creditos AS "creditosPermitidos",
              usados.creditos AS "creditosUsados"
       FROM base CROSS JOIN extra CROSS JOIN usados`,
      [usuarioId]
    );
    if (balance.rows[0].creditosUsados + curso.creditos > balance.rows[0].creditosPermitidos) {
      throw new HttpError(
        409,
        "CREDITOS_INSUFICIENTES",
        `No tienes créditos suficientes. Disponibles: ${Math.max(0, balance.rows[0].creditosPermitidos - balance.rows[0].creditosUsados)}; esta materia requiere ${curso.creditos}.`
      );
    }

    // Bloquea la fila del curso $1 y lee cupos_disponibles, que guarda el límite de matrículas.
    const limite = await cliente.query<{ cupos_disponibles: number }>(
      "SELECT cupos_disponibles FROM cursos WHERE id = $1 FOR UPDATE",
      [curso.id]
    );
    if (!limite.rows[0]) {
      throw new HttpError(404, "CURSO_NO_ENCONTRADO", "El curso seleccionado ya no existe");
    }

    // Busca una nota de al menos 3.0 para la materia $2 del estudiante $1.
    const aprobada = await cliente.query(
      `SELECT 1 FROM calificaciones
       WHERE usuario_id = $1 AND codigo_materia = $2 AND nota >= 3.0
       LIMIT 1`,
      [usuarioId, curso.codigoPensum]
    );
    if (aprobada.rowCount) {
      throw new HttpError(409, "MATERIA_YA_APROBADA", "Ya aprobaste esta materia y no puedes matricularla de nuevo");
    }

    // Busca los prerrequisitos de la materia $2 en la carrera $3.
    // LEFT JOIN intenta encontrar una nota aprobatoria del estudiante $1 para cada requisito.
    // El filtro IS NULL devuelve los requisitos sin esa coincidencia.
    const requisitosPendientes = await cliente.query<{ codigo_requisito: string }>(
      `SELECT prerrequisito.codigo_requisito
       FROM prerrequisitos_materia AS prerrequisito
       LEFT JOIN calificaciones AS calificacion
         ON calificacion.usuario_id = $1
         AND calificacion.codigo_materia = prerrequisito.codigo_requisito
         AND calificacion.nota >= 3.0
       WHERE prerrequisito.codigo_materia = $2 AND prerrequisito.carrera_codigo = $3
         AND calificacion.usuario_id IS NULL
       ORDER BY prerrequisito.codigo_requisito`,
      [usuarioId, curso.codigoPensum, plan.carrera_codigo]
    );
    if (requisitosPendientes.rowCount) {
      const codigos = requisitosPendientes.rows.map((fila) => fila.codigo_requisito);
      throw new HttpError(409, "PRERREQUISITOS_PENDIENTES", `Debes aprobar primero: ${codigos.join(", ")}`);
    }

    // COUNT(*) cuenta las matrículas activas del curso $1 en el periodo.
    // Si el conteo llega al límite, el SIS rechaza la solicitud por falta de cupos.
    const ocupacion = await cliente.query<{ cantidad: number }>(
      `SELECT COUNT(*)::integer AS cantidad
       FROM matriculas
       WHERE curso_id = $1 AND estado = 'Activa'
         AND periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END`,
      [curso.id]
    );

    const reservas = await cliente.query<{ cantidad: number }>(
      "SELECT count(*)::integer AS cantidad FROM reservas_cupos WHERE curso_id=$1 AND periodo=to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE)<=6 THEN '-1' ELSE '-2' END AND vence_en>clock_timestamp() AND ($2::uuid IS NULL OR solicitud_id<>$2)",
      [curso.id, contexto?.id ?? null]
    );
    const cantidad = ocupacion.rows[0].cantidad + reservas.rows[0].cantidad;

    // cupos_disponibles stores the enrollment limit; the catalog subtracts active registrations.
    if (cantidad >= limite.rows[0].cupos_disponibles) {
      throw new HttpError(
        409,
        "SIN_CUPOS",
        "El curso ya no tiene cupos disponibles"
      );
    }

    // La fila del estudiante permanece bloqueada hasta COMMIT. Se consulta el
    // horario actual en BD, nunca el JSON histórico ni datos del navegador.
    // Revisa el grupo nuevo $2 y los grupos que ya cursa el estudiante $1.
    // NOT EXISTS detecta cursos sin bloques en curso_horarios. LIMIT 1 devuelve el primero.
    const sinHorario = await cliente.query<{ codigo: string; horario: string }>(
      `SELECT c.codigo, c.horario FROM cursos c
       WHERE (c.id = $2 OR c.id IN (
         SELECT curso_id FROM matriculas WHERE usuario_id = $1 AND estado = 'Activa'
           AND periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END
       )) AND NOT EXISTS (SELECT 1 FROM curso_horarios h WHERE h.curso_id = c.id)
       ORDER BY c.id LIMIT 1`, [usuarioId, curso.id]
    );
    if (sinHorario.rows[0]) {
      const pendiente = sinHorario.rows[0];
      throw new HttpError(409, "HORARIO_PENDIENTE_REVISION",
        `El horario de ${pendiente.codigo} (${pendiente.horario}) requiere revisión académica antes de matricular.`);
    }
    // Compara los bloques de las matrículas activas de $1 con los del grupo nuevo $2.
    // Hay cruce si son del mismo día y cada bloque empieza antes de que termine el otro.
    // Si un bloque termina exactamente cuando empieza el siguiente, pueden coexistir.
    const conflictos = await cliente.query<{ codigo: string; nombre: string; dia: number; inicio: string; fin: string }>(
      `SELECT c.codigo, materia.nombre, h.dia,
              to_char(h.hora_inicio, 'HH24:MI') AS inicio, to_char(h.hora_fin, 'HH24:MI') AS fin
       FROM matriculas m JOIN cursos c ON c.id = m.curso_id
       JOIN materias materia ON materia.codigo = c.codigo_pensum
       JOIN curso_horarios h ON h.curso_id = c.id
       JOIN curso_horarios nuevo ON nuevo.curso_id = $2 AND nuevo.dia = h.dia
         AND nuevo.hora_inicio < h.hora_fin AND h.hora_inicio < nuevo.hora_fin
       WHERE m.usuario_id = $1 AND m.estado = 'Activa'
         AND m.periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END
       ORDER BY c.id, h.dia, h.hora_inicio LIMIT 1`, [usuarioId, curso.id]
    );
    if (conflictos.rows[0]) {
      const conflicto = conflictos.rows[0];
      const dias = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      throw new HttpError(409, "CRUCE_HORARIO",
        `Cruce con ${conflicto.codigo} — ${conflicto.nombre}: ${dias[conflicto.dia]} ${conflicto.inicio} - ${conflicto.fin}.`);
    }

    // Guarda al estudiante $1, el curso $2 y una copia de los datos del curso en JSONB ($3).
    // PostgreSQL completa los campos por defecto. RETURNING devuelve la matrícula guardada.
    const resultado = await cliente.query<Matricula>(
      `INSERT INTO matriculas (
         usuario_id,
         curso_id,
         curso
       )
       VALUES ($1, $2, $3::jsonb)
       RETURNING id, curso, estado, fecha`,
      [usuarioId, curso.id, JSON.stringify(curso)]
    );

    if (contexto) await confirmarSolicitud(cliente, contexto, resultado.rows[0].id);

    // Confirma la inscripción y libera los bloqueos de la transacción.
    await cliente.query("COMMIT");

    return {
      creada: true,
      matricula: resultado.rows[0]
    };
  } catch (error) {
    // Revierte la transacción si falla una comprobación o una consulta.
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}

export async function listarEstudiantesPorCurso(
  cursoId: number,
  codigoMateria: string
): Promise<EstudianteMatriculado[]> {
  // Lista estudiantes activos con matrícula activa del periodo en el curso $1.
  // LEFT JOIN agrega la nota y los cortes de la materia $2 si existen.
  // TypeScript convierte las notas de texto a número y mantiene null cuando faltan.
  const resultado = await pool.query<Omit<EstudianteMatriculado, "nota" | "corte1" | "corte2" | "corte3"> & { nota: string | null; corte1: string | null; corte2: string | null; corte3: string | null }>(
    `SELECT usuario.id, usuario.nombre, usuario.cedula, calificacion.nota::text AS nota,
            calificacion.corte_1::text AS corte1, calificacion.corte_2::text AS corte2, calificacion.corte_3::text AS corte3
     FROM matriculas AS matricula
     JOIN usuarios AS usuario ON usuario.id = matricula.usuario_id
     LEFT JOIN calificaciones AS calificacion
       ON calificacion.usuario_id = usuario.id
       AND calificacion.codigo_materia = $2
     WHERE matricula.curso_id = $1
       AND matricula.estado = 'Activa'
       AND matricula.periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END
       AND usuario.rol = 'estudiante'
       AND usuario.activo = TRUE
     ORDER BY usuario.nombre, usuario.id`,
    [cursoId, codigoMateria]
  );

  return resultado.rows.map((estudiante) => ({
    ...estudiante,
    nota: estudiante.nota === null ? null : Number(estudiante.nota),
    corte1: estudiante.corte1 === null ? null : Number(estudiante.corte1),
    corte2: estudiante.corte2 === null ? null : Number(estudiante.corte2),
    corte3: estudiante.corte3 === null ? null : Number(estudiante.corte3)
  }));
}

export async function estaMatriculadoEnCurso(usuarioId: number, cursoId: number): Promise<boolean> {
  // Comprueba si $1 tiene una matrícula activa en el curso $2 durante el periodo actual.
  const resultado = await pool.query(
    `SELECT 1 FROM matriculas
     WHERE usuario_id = $1 AND curso_id = $2 AND estado = 'Activa'
       AND periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END
     LIMIT 1`,
    [usuarioId, cursoId]
  );
  return resultado.rowCount !== 0;
}

export async function listarPorEstudiante(
  usuarioId: number
): Promise<Matricula[]> {
  // Lista las matrículas del periodo para el estudiante $1.
  // Combina el JSON histórico con el docente, el horario y los bloques actuales del grupo.
  // El operador || toma los valores del objeto de la derecha cuando una clave se repite.
  const resultado = await pool.query<Matricula>(
    `SELECT m.id, m.estado, m.fecha, m.curso || jsonb_build_object(
       'docente', docente.nombre,
       'docenteId', docente.id,
       'horario', c.horario,
       'sesiones', COALESCE((SELECT jsonb_agg(jsonb_build_object('dia',h.dia,'horaInicio',h.hora_inicio,'horaFin',h.hora_fin)
         ORDER BY h.dia,h.hora_inicio) FROM curso_horarios h WHERE h.curso_id=c.id),'[]'::jsonb)) AS curso
     FROM matriculas m JOIN cursos c ON c.id=m.curso_id
     LEFT JOIN usuarios docente ON docente.id = c.docente_id
     WHERE m.usuario_id = $1
       AND m.periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END
     ORDER BY m.fecha DESC, m.id DESC`,
    [usuarioId]
  );

  return resultado.rows;
}

export async function listarTodasDelPeriodo(): Promise<MatriculaAdministrativa[]> {
  // Lista las matrículas activas del periodo con los datos del estudiante y el curso.
  // jsonb_build_object arma el objeto de curso. LEFT JOIN mantiene la matrícula si falta el docente
  // o la materia ya no coincide con el pensum del estudiante.
  const resultado = await pool.query<MatriculaAdministrativa>(
    `SELECT matricula.id,
            usuario.id AS "usuarioId",
            usuario.nombre AS "nombreEstudiante",
            usuario.correo AS "correoEstudiante",
            jsonb_build_object(
              'id', curso.id,
              'codigo', curso.codigo,
              'codigoPensum', curso.codigo_pensum,
              'nombre', materia.nombre,
              'docente', docente.nombre,
              'docenteId', docente.id,
              'horario', curso.horario,
              'cuposTotales', curso.cupos_totales,
              'cuposDisponibles', curso.cupos_disponibles,
              'semestre', plan.semestre,
              'creditos', plan.creditos
            ) AS curso,
            matricula.estado,
            matricula.fecha,
            matricula.periodo
     FROM matriculas AS matricula
     JOIN usuarios AS usuario ON usuario.id = matricula.usuario_id
     JOIN cursos AS curso ON curso.id = matricula.curso_id
     JOIN materias AS materia ON materia.codigo = curso.codigo_pensum
     LEFT JOIN materias_pensum AS plan ON plan.codigo = materia.codigo AND plan.carrera_codigo = usuario.carrera_codigo
     LEFT JOIN usuarios AS docente ON docente.id = curso.docente_id
     WHERE matricula.estado = 'Activa'
       AND matricula.periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END
     ORDER BY usuario.nombre, curso.codigo, matricula.id`
  );
  return resultado.rows;
}

export async function eliminarMatricula(
  usuarioId: number,
  matriculaId: number
): Promise<boolean> {
  // Elimina la matrícula $1 solo si pertenece al estudiante $2 y al periodo actual.
  // RETURNING permite comprobar si se borró una fila. El cupo libre se calcula al contar las matrículas restantes.
  const resultado = await pool.query(
    `DELETE FROM matriculas
     WHERE id = $1 AND usuario_id = $2
       AND periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END
     RETURNING id`,
    [matriculaId, usuarioId]
  );

  return (resultado.rowCount ?? 0) > 0;
}
