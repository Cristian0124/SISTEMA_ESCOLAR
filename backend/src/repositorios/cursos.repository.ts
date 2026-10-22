import { pool } from "../config/database";

export interface Curso {
  id: number;
  codigo: string;
  nombre: string;
  docente: string;
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
    curso.docente,
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
  LEFT JOIN matriculas AS matricula
    ON matricula.curso_id = curso.id AND matricula.estado = 'Activa'
`;

export async function listarCursos(): Promise<Curso[]> {
  const resultado = await pool.query<Curso>(
    `${consultaCursos} GROUP BY curso.id, materia.codigo ORDER BY curso.id`
  );
  return resultado.rows;
}

export async function buscarCursoPorId(id: number): Promise<Curso | null> {
  const resultado = await pool.query<Curso>(
    `${consultaCursos} WHERE curso.id = $1 GROUP BY curso.id, materia.codigo LIMIT 1`,
    [id]
  );
  return resultado.rows[0] ?? null;
}

export async function asignarDocente(cursoId: number, nombreDocente: string): Promise<boolean> {
  const resultado = await pool.query(
    "UPDATE cursos SET docente = $2 WHERE id = $1 RETURNING id",
    [cursoId, nombreDocente]
  );
  return resultado.rowCount !== 0;
}
