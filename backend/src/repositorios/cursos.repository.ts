import { pool } from "../config/database";

export interface Curso {
  id: number;
  codigo: string;
  nombre: string;
  docente: string | null;
  docenteId: number | null;
  horario: string;
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

const consultaCursos = `
  SELECT
    curso.id,
    curso.codigo,
    materia.nombre,
    docente.id AS "docenteId",
    docente.nombre AS docente,
    curso.horario,
    curso.cupos_totales AS "cuposTotales",
    GREATEST(
      curso.cupos_disponibles - COUNT(matricula.id)::integer,
      0
    ) AS "cuposDisponibles",
    materia.semestre,
    materia.creditos,
    curso.codigo_pensum AS "codigoPensum",
    carrera.codigo AS "carreraCodigo",
    carrera.nombre AS "carreraNombre",
    facultad.codigo AS "facultadCodigo",
    facultad.nombre AS "facultadNombre"
  FROM cursos AS curso
  JOIN materias_pensum AS materia ON materia.codigo = curso.codigo_pensum
  LEFT JOIN carreras AS carrera ON carrera.codigo = materia.carrera_codigo
  LEFT JOIN facultades AS facultad ON facultad.codigo = carrera.facultad_codigo
  LEFT JOIN usuarios AS docente ON docente.id = curso.docente_id
  LEFT JOIN matriculas AS matricula
    ON matricula.curso_id = curso.id AND matricula.estado = 'Activa'
    AND matricula.periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END
`;

export async function listarCursos(usuarioId?: number): Promise<Curso[]> {
  const resultado = await pool.query<Curso>(
    `${consultaCursos} ${usuarioId ? "WHERE materia_del_programa(materia.codigo, $1)" : ""} GROUP BY curso.id, materia.codigo, docente.id, carrera.codigo, facultad.codigo ORDER BY curso.id`,
    usuarioId ? [usuarioId] : []
  );
  return resultado.rows;
}

export async function buscarCursoPorId(id: number): Promise<Curso | null> {
  const resultado = await pool.query<Curso>(
    `${consultaCursos} WHERE curso.id = $1 GROUP BY curso.id, materia.codigo, docente.id, carrera.codigo, facultad.codigo LIMIT 1`,
    [id]
  );
  return resultado.rows[0] ?? null;
}

export async function asignarDocente(cursoId: number, profesorId: number): Promise<boolean> {
  const resultado = await pool.query(
    "UPDATE cursos SET docente_id = $2 WHERE id = $1 RETURNING id",
    [cursoId, profesorId]
  );
  return resultado.rowCount !== 0;
}

export async function crearCurso(
  codigoPensum: string,
  profesorId: number,
  horario: string,
  cuposTotales: number
): Promise<Curso | null> {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const materia = await cliente.query(
      `SELECT materia.codigo
       FROM materias_pensum AS materia
       JOIN carreras AS carrera ON carrera.codigo = materia.carrera_codigo
       JOIN facultades AS facultad ON facultad.codigo = carrera.facultad_codigo
       WHERE materia.codigo = $1
       FOR SHARE OF materia, carrera, facultad`,
      [codigoPensum]
    );
    if (!materia.rowCount) {
      await cliente.query("ROLLBACK");
      return null;
    }

    await cliente.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`oferta:${codigoPensum}`]);
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

    const insertado = await cliente.query<{ id: number }>(
      `INSERT INTO cursos (codigo, codigo_pensum, docente_id, horario, cupos_totales, cupos_disponibles)
       VALUES ($1, $2, $3, $4, $5, $5)
       RETURNING id`,
      [codigoCurso, codigoPensum, profesorId, horario, cuposTotales]
    );
    const cursoId = insertado.rows[0].id;
    const curso = await cliente.query<Curso>(
      `${consultaCursos} WHERE curso.id = $1
       GROUP BY curso.id, materia.codigo, docente.id, carrera.codigo, facultad.codigo`,
      [cursoId]
    );
    await cliente.query("COMMIT");
    return curso.rows[0] ?? null;
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}
