import { pool } from "../config/database";
import type { Curso } from "./cursos.repository";
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
  curso: Curso
): Promise<{ creada: boolean; matricula: Matricula }> {
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    // Serializa las inscripciones del mismo curso.
    // Evita que dos solicitudes ocupen el último cupo a la vez.
    await cliente.query(
      "SELECT pg_advisory_xact_lock($1::integer, $2::integer)",
      [20261017, curso.id]
    );

    const existente = await cliente.query<Matricula>(
      `SELECT id, curso, estado, fecha
       FROM matriculas
       WHERE usuario_id = $1 AND curso_id = $2
         AND periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END`,
      [usuarioId, curso.id]
    );

    const matriculaExistente = existente.rows[0];

    if (matriculaExistente) {
      await cliente.query("COMMIT");

      return {
        creada: false,
        matricula: matriculaExistente
      };
    }

    // Serializa las matrículas del estudiante para que las solicitudes paralelas
    // no permitan superar su cupo de créditos.
    await cliente.query("SELECT id FROM usuarios WHERE id = $1 FOR UPDATE", [usuarioId]);
    const pertenece = await cliente.query("SELECT materia_del_programa($1, $2) AS pertenece", [curso.codigoPensum, usuarioId]);
    if (!pertenece.rows[0]?.pertenece) {
      throw new HttpError(409, "CURSO_OTRA_CARRERA", "El curso no pertenece al pensum de tu carrera");
    }
    const plan = await cliente.query(`SELECT c.prerrequisitos_verificados FROM usuarios u
      JOIN carreras c ON c.codigo = u.carrera_codigo WHERE u.id = $1`, [usuarioId]);
    if (plan.rows[0] && !plan.rows[0].prerrequisitos_verificados) {
      throw new HttpError(409, "PENSUM_PENDIENTE_VALIDACION", "Los prerrequisitos del programa requieren validación académica antes de matricular");
    }
    const balance = await cliente.query<{ creditosPermitidos: number; creditosUsados: number }>(
      `WITH nivel AS (
         SELECT LEAST(COALESCE((
           SELECT MAX(materia.semestre)::integer + 1
           FROM calificaciones AS calificacion
           JOIN materias_pensum AS materia ON materia.codigo = calificacion.codigo_materia
           WHERE calificacion.usuario_id = $1 AND calificacion.nota >= 3.0 AND materia_del_programa(materia.codigo, $1)
         ), 1), (SELECT COALESCE(MAX(semestre), 1) FROM materias_pensum WHERE materia_del_programa(codigo, $1)))::integer AS semestre
       ), base AS (
         SELECT COALESCE(SUM(creditos), 0)::integer AS creditos
         FROM materias_pensum WHERE semestre = (SELECT semestre FROM nivel) AND materia_del_programa(codigo, $1)
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
         JOIN materias_pensum AS materia ON materia.codigo = curso.codigo_pensum
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

    const limite = await cliente.query<{ cupos_disponibles: number }>(
      "SELECT cupos_disponibles FROM cursos WHERE id = $1 FOR UPDATE",
      [curso.id]
    );
    if (!limite.rows[0]) {
      throw new HttpError(404, "CURSO_NO_ENCONTRADO", "El curso seleccionado ya no existe");
    }

    const aprobada = await cliente.query(
      `SELECT 1 FROM calificaciones
       WHERE usuario_id = $1 AND codigo_materia = $2 AND nota >= 3.0
       LIMIT 1`,
      [usuarioId, curso.codigoPensum]
    );
    if (aprobada.rowCount) {
      throw new HttpError(409, "MATERIA_YA_APROBADA", "Ya aprobaste esta materia y no puedes matricularla de nuevo");
    }

    const requisitosPendientes = await cliente.query<{ codigo_requisito: string }>(
      `SELECT prerrequisito.codigo_requisito
       FROM prerrequisitos_materia AS prerrequisito
       LEFT JOIN calificaciones AS calificacion
         ON calificacion.usuario_id = $1
         AND calificacion.codigo_materia = prerrequisito.codigo_requisito
         AND calificacion.nota >= 3.0
       WHERE prerrequisito.codigo_materia = $2
         AND calificacion.usuario_id IS NULL
       ORDER BY prerrequisito.codigo_requisito`,
      [usuarioId, curso.codigoPensum]
    );
    if (requisitosPendientes.rowCount) {
      const codigos = requisitosPendientes.rows.map((fila) => fila.codigo_requisito);
      throw new HttpError(409, "PRERREQUISITOS_PENDIENTES", `Debes aprobar primero: ${codigos.join(", ")}`);
    }

    const ocupacion = await cliente.query<{ cantidad: number }>(
      `SELECT COUNT(*)::integer AS cantidad
       FROM matriculas
       WHERE curso_id = $1 AND estado = 'Activa'
         AND periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END`,
      [curso.id]
    );

    const cantidad = ocupacion.rows[0].cantidad;

    // cupos_disponibles stores the enrollment limit; the catalog subtracts active registrations.
    if (cantidad >= limite.rows[0].cupos_disponibles) {
      throw new HttpError(
        409,
        "SIN_CUPOS",
        "El curso ya no tiene cupos disponibles"
      );
    }

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

    await cliente.query("COMMIT");

    return {
      creada: true,
      matricula: resultado.rows[0]
    };
  } catch (error) {
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
  const resultado = await pool.query<Matricula>(
    `SELECT id, curso, estado, fecha
     FROM matriculas
     WHERE usuario_id = $1
       AND periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END
     ORDER BY fecha DESC, id DESC`,
    [usuarioId]
  );

  return resultado.rows;
}

export async function listarTodasDelPeriodo(): Promise<MatriculaAdministrativa[]> {
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
              'semestre', materia.semestre,
              'creditos', materia.creditos
            ) AS curso,
            matricula.estado,
            matricula.fecha,
            matricula.periodo
     FROM matriculas AS matricula
     JOIN usuarios AS usuario ON usuario.id = matricula.usuario_id
     JOIN cursos AS curso ON curso.id = matricula.curso_id
     JOIN materias_pensum AS materia ON materia.codigo = curso.codigo_pensum
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
  const resultado = await pool.query(
    `DELETE FROM matriculas
     WHERE id = $1 AND usuario_id = $2
       AND periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END
     RETURNING id`,
    [matriculaId, usuarioId]
  );

  return (resultado.rowCount ?? 0) > 0;
}
