import { pool } from "../config/database";

export interface AvanceMateria {
  codigo: string;
  nombre: string;
  semestre: number;
  creditos: number;
  prerrequisitos: string[];
  nota: number | null;
}

export interface CortesCalificacion {
  corte1: number;
  corte2: number;
  corte3: number;
}

export interface CalificacionMateriaMatriculada {
  matriculaId: number;
  cursoCodigo: string;
  codigoMateria: string;
  nombreMateria: string;
  semestre: number;
  horario: string;
  corte1: number | null;
  corte2: number | null;
  corte3: number | null;
  nota: number | null;
}

export async function listarAvanceEstudiante(usuarioId: number): Promise<AvanceMateria[]> {
  const resultado = await pool.query<Omit<AvanceMateria, "nota"> & { nota: string | null }>(
    `SELECT
       materia.codigo,
       materia.nombre,
       materia.semestre,
       materia.creditos,
       COALESCE(
         ARRAY_AGG(prerrequisito.codigo_requisito ORDER BY prerrequisito.codigo_requisito)
           FILTER (WHERE prerrequisito.codigo_requisito IS NOT NULL),
         ARRAY[]::VARCHAR[]
       ) AS prerrequisitos,
       calificacion.nota::text AS nota
     FROM materias_pensum AS materia
     LEFT JOIN prerrequisitos_materia AS prerrequisito
       ON prerrequisito.codigo_materia = materia.codigo
     LEFT JOIN calificaciones AS calificacion
       ON calificacion.codigo_materia = materia.codigo
       AND calificacion.usuario_id = $1
     GROUP BY materia.codigo, calificacion.nota
     ORDER BY materia.semestre, materia.codigo`,
    [usuarioId]
  );

  return resultado.rows.map((materia) => ({
    ...materia,
    nota: materia.nota === null ? null : Number(materia.nota)
  }));
}

export async function listarCodigosAprobados(usuarioId: number): Promise<string[]> {
  const resultado = await pool.query<{ codigo_materia: string }>(
    "SELECT codigo_materia FROM calificaciones WHERE usuario_id = $1 AND nota >= 3.0",
    [usuarioId]
  );
  return resultado.rows.map((fila) => fila.codigo_materia);
}

export async function materiaExiste(codigo: string): Promise<boolean> {
  const resultado = await pool.query(
    "SELECT 1 FROM materias_pensum WHERE codigo = $1 LIMIT 1",
    [codigo]
  );
  return resultado.rowCount !== 0;
}

export async function guardarCalificacion(
  usuarioId: number,
  codigoMateria: string,
  cortes: CortesCalificacion,
  nota: number,
  registradaPor: number
): Promise<void> {
  await pool.query(
    `INSERT INTO calificaciones (
       usuario_id, codigo_materia, corte_1, corte_2, corte_3, nota, registrada_por
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (usuario_id, codigo_materia)
     DO UPDATE SET corte_1 = EXCLUDED.corte_1,
                   corte_2 = EXCLUDED.corte_2,
                   corte_3 = EXCLUDED.corte_3,
                   nota = EXCLUDED.nota,
                   registrada_por = EXCLUDED.registrada_por,
                   actualizada_en = NOW()`,
    [usuarioId, codigoMateria, cortes.corte1, cortes.corte2, cortes.corte3, nota, registradaPor]
  );
}

export async function listarCalificacionesMateriasMatriculadas(
  usuarioId: number
): Promise<CalificacionMateriaMatriculada[]> {
  const resultado = await pool.query<{
    matriculaId: number;
    cursoCodigo: string;
    codigoMateria: string;
    nombreMateria: string;
    semestre: number;
    horario: string;
    corte1: string | null;
    corte2: string | null;
    corte3: string | null;
    nota: string | null;
  }>(
    `SELECT
       matricula.id AS "matriculaId",
       curso.codigo AS "cursoCodigo",
       materia.codigo AS "codigoMateria",
       materia.nombre AS "nombreMateria",
       materia.semestre,
       curso.horario,
       calificacion.corte_1::text AS "corte1",
       calificacion.corte_2::text AS "corte2",
       calificacion.corte_3::text AS "corte3",
       calificacion.nota::text AS nota
     FROM matriculas AS matricula
     JOIN cursos AS curso ON curso.id = matricula.curso_id
     JOIN materias_pensum AS materia ON materia.codigo = curso.codigo_pensum
     LEFT JOIN calificaciones AS calificacion
       ON calificacion.usuario_id = matricula.usuario_id
       AND calificacion.codigo_materia = materia.codigo
     WHERE matricula.usuario_id = $1 AND matricula.estado = 'Activa'
       AND matricula.periodo = to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END
     ORDER BY materia.semestre, materia.nombre, curso.codigo`,
    [usuarioId]
  );

  return resultado.rows.map((materia) => ({
    matriculaId: materia.matriculaId,
    cursoCodigo: materia.cursoCodigo,
    codigoMateria: materia.codigoMateria,
    nombreMateria: materia.nombreMateria,
    semestre: materia.semestre,
    horario: materia.horario,
    corte1: materia.corte1 === null ? null : Number(materia.corte1),
    corte2: materia.corte2 === null ? null : Number(materia.corte2),
    corte3: materia.corte3 === null ? null : Number(materia.corte3),
    nota: materia.nota === null ? null : Number(materia.nota)
  }));
}

export interface EstudianteEncontrado {
  id: number;
  nombre: string;
  cedula: string;
}

export async function buscarEstudiantePorCedula(cedula: string): Promise<EstudianteEncontrado | null> {
  const resultado = await pool.query<EstudianteEncontrado>(
    `SELECT id, nombre, cedula
     FROM usuarios
     WHERE LOWER(BTRIM(cedula)) = LOWER(BTRIM($1))
       AND rol = 'estudiante'
       AND activo = TRUE
     LIMIT 1`,
    [cedula]
  );
  return resultado.rows[0] ?? null;
}
