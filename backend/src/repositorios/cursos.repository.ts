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
    curso.cupos_disponibles AS "cuposDisponibles",
    materia.semestre,
    materia.creditos,
    curso.codigo_pensum AS "codigoPensum"
  FROM cursos AS curso
  JOIN materias_pensum AS materia ON materia.codigo = curso.codigo_pensum
`;

export async function listarCursos(): Promise<Curso[]> {
  const resultado = await pool.query<Curso>(
    `${consultaCursos} ORDER BY curso.id`
  );
  return resultado.rows;
}

export async function buscarCursoPorId(id: number): Promise<Curso | null> {
  const resultado = await pool.query<Curso>(
    `${consultaCursos} WHERE curso.id = $1 LIMIT 1`,
    [id]
  );
  return resultado.rows[0] ?? null;
}
