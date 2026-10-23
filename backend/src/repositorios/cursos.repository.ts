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
    curso.codigo_pensum AS "codigoPensum"
  FROM cursos AS curso
  JOIN materias_pensum AS materia ON materia.codigo = curso.codigo_pensum
  LEFT JOIN usuarios AS docente ON docente.id = curso.docente_id
  LEFT JOIN matriculas AS matricula
    ON matricula.curso_id = curso.id AND matricula.estado = 'Activa'
    AND matricula.periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END
`;

export async function listarCursos(): Promise<Curso[]> {
  const resultado = await pool.query<Curso>(
    `${consultaCursos} GROUP BY curso.id, materia.codigo, docente.id ORDER BY curso.id`
  );
  return resultado.rows;
}

export async function buscarCursoPorId(id: number): Promise<Curso | null> {
  const resultado = await pool.query<Curso>(
    `${consultaCursos} WHERE curso.id = $1 GROUP BY curso.id, materia.codigo, docente.id LIMIT 1`,
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
