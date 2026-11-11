import { pool } from "../config/database";
import type { SesionCurso } from '../services/horarios.service';

export interface Curso {
  id: number;
  codigo: string;
  nombre: string;
  docente: string | null;
  docenteId: number | null;
  horario: string;
  sesiones?: { dia: number; horaInicio: string; horaFin: string }[];
  cuposTotales: number;
  cuposDisponibles: number;
  semestre: number;
  creditos: number;
  codigoPensum: string;
  carreraCodigo: string | null;
  carreraNombre: string | null;
  facultadCodigo: string | null;
  facultadNombre: string | null;
}

// Consulta compartida por el catálogo y la búsqueda de un grupo. $1 es el estudiante o NULL.
// La subconsulta de horarios arma un arreglo JSON ordenado por día y hora.
// Los cupos libres se calculan restando las matrículas activas del periodo al límite guardado.
// JOIN LATERAL busca un plan por materia. Con $1 usa la carrera del estudiante;
// sin $1 elige el primer plan por código de carrera. string_agg lista todas las carreras que la ofrecen.
// LEFT JOIN conserva los grupos que todavía no tienen docente.
const consultaCursos = `
  SELECT
    curso.id,
    curso.codigo,
    materia.nombre,
    docente.id AS "docenteId",
    docente.nombre AS docente,
    curso.horario,
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'dia', h.dia, 'horaInicio', h.hora_inicio, 'horaFin', h.hora_fin)
      ORDER BY h.dia, h.hora_inicio) FROM curso_horarios h WHERE h.curso_id = curso.id), '[]'::jsonb) AS sesiones,
    curso.cupos_totales AS "cuposTotales",
    GREATEST(curso.cupos_disponibles - (
      SELECT COUNT(*)::integer FROM matriculas m
      WHERE m.curso_id = curso.id AND m.estado = 'Activa'
        AND m.periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END
    ) - (
      SELECT COUNT(*)::integer FROM reservas_cupos r WHERE r.curso_id=curso.id
      AND r.periodo=to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE)<=6 THEN '-1' ELSE '-2' END
      AND r.vence_en>clock_timestamp()
    ), 0) AS "cuposDisponibles",
    plan.semestre,
    plan.creditos,
    curso.codigo_pensum AS "codigoPensum",
    carrera.codigo AS "carreraCodigo",
    CASE WHEN $1::integer IS NULL THEN oferta.carreras ELSE carrera.nombre END AS "carreraNombre",
    facultad.codigo AS "facultadCodigo",
    facultad.nombre AS "facultadNombre"
  FROM cursos AS curso
  JOIN materias AS materia ON materia.codigo = curso.codigo_pensum
  JOIN LATERAL (
    SELECT p.* FROM materias_pensum p
    WHERE p.codigo = materia.codigo
      AND ($1::integer IS NULL OR p.carrera_codigo = (SELECT carrera_codigo FROM usuarios WHERE id = $1))
    ORDER BY p.carrera_codigo LIMIT 1
  ) AS plan ON TRUE
  JOIN carreras AS carrera ON carrera.codigo = plan.carrera_codigo
  JOIN facultades AS facultad ON facultad.codigo = carrera.facultad_codigo
  CROSS JOIN LATERAL (
    SELECT string_agg(c.nombre, ', ' ORDER BY c.nombre) AS carreras
    FROM materias_pensum p JOIN carreras c ON c.codigo = p.carrera_codigo
    WHERE p.codigo = materia.codigo
  ) AS oferta
  LEFT JOIN usuarios AS docente ON docente.id = curso.docente_id
`;

export async function listarCursos(usuarioId?: number): Promise<Curso[]> {
  // Reutiliza la consulta base con el estudiante opcional y ordena los grupos por ID.
  const resultado = await pool.query<Curso>(`${consultaCursos} ORDER BY curso.id`, [usuarioId ?? null]);
  return resultado.rows;
}

export async function buscarCursoPorId(id: number): Promise<Curso | null> {
  // Envía NULL en $1 para consultar sin filtrar por carrera y selecciona el grupo $2.
  const resultado = await pool.query<Curso>(`${consultaCursos} WHERE curso.id = $2`, [null, id]);
  return resultado.rows[0] ?? null;
}

export async function asignarDocente(cursoId: number, profesorId: number): Promise<boolean> {
  const resultado = await pool.query(
    // Asigna el profesor $2 al curso $1. RETURNING permite comprobar si existía el grupo.
    "UPDATE cursos SET docente_id = $2 WHERE id = $1 RETURNING id",
    [cursoId, profesorId]
  );
  return resultado.rowCount !== 0;
}

export async function crearCurso(
  codigoPensum: string,
  profesorId: number,
  horario: string,
  cuposTotales: number,
  sesiones?: SesionCurso[]
): Promise<Curso | null> {
  const cliente = await pool.connect();
  try {
    // Crea el grupo y sus bloques de horario en la misma transacción.
    await cliente.query("BEGIN");
    // Exige que la materia $1 exista y aparezca en algún pensum. FOR SHARE protege su fila
    // mientras se crea el grupo. Si no hay coincidencia, se cancela la transacción.
    const materia = await cliente.query(
      `SELECT materia.codigo
       FROM materias AS materia
       WHERE materia.codigo = $1 AND EXISTS (SELECT 1 FROM materias_pensum WHERE codigo = $1)
       FOR SHARE OF materia`,
      [codigoPensum]
    );
    if (!materia.rowCount) {
      await cliente.query("ROLLBACK");
      return null;
    }

    // Bloquea por materia hasta cerrar la transacción, para que dos altas no calculen el mismo código.
    await cliente.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`oferta:${codigoPensum}`]);
    // Filtra los códigos de grupo de la materia $1 y extrae el sufijo numérico.
    // MAX obtiene el mayor. COALESCE permite empezar en 1 cuando todavía no hay grupos.
    const consecutivo = await cliente.query<{ siguiente: number }>(
      `SELECT COALESCE(MAX(substring(codigo FROM '^[^-]+-([0-9]+)$')::integer), 0) + 1 AS siguiente
       FROM cursos
       WHERE codigo LIKE $1 || '-%' AND codigo ~ '^[^-]+-[0-9]+$'`,
      [codigoPensum]
    );
    const numero = Number(consecutivo.rows[0]?.siguiente ?? 1);
    const sufijo = String(numero).padStart(2, "0");
    const codigoCurso = `${codigoPensum}-${sufijo}`;
    if (codigoCurso.length > 10) throw new Error("Se agotaron los códigos de grupo para esta asignatura");

    // Inserta código ($1), materia ($2), docente ($3), horario ($4) y cupo inicial ($5).
    // RETURNING devuelve el ID generado para asociar los bloques de horario.
    const insertado = await cliente.query<{ id: number }>(
      `INSERT INTO cursos (codigo, codigo_pensum, docente_id, horario, cupos_totales, cupos_disponibles)
       VALUES ($1, $2, $3, $4, $5, $5)
       RETURNING id`,
      [codigoCurso, codigoPensum, profesorId, horario, cuposTotales]
    );
    const cursoId = insertado.rows[0].id;
    if (sesiones) {
      // Si se proporcionaron sesiones, reemplaza los bloques que haya generado el trigger para el curso $1.
      await cliente.query('DELETE FROM curso_horarios WHERE curso_id=$1',[cursoId]);
      // Inserta cada bloque con curso ($1), día ($2), hora de inicio ($3) y hora de fin ($4).
      for (const s of sesiones) await cliente.query(`INSERT INTO curso_horarios(curso_id,dia,hora_inicio,hora_fin)
        VALUES($1,$2,$3,$4)`,[cursoId,s.dia,s.horaInicio,s.horaFin]);
    }
    // Vuelve a leer el grupo recién creado, incluidos sus bloques, antes de confirmar con COMMIT.
    const curso = await cliente.query<Curso>(
      `${consultaCursos} WHERE curso.id = $2`, [null, cursoId]
    );
    await cliente.query("COMMIT");
    return curso.rows[0] ?? null;
  } catch (error) {
    // Si una consulta falla, revierte la creación del grupo y sus bloques.
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}
