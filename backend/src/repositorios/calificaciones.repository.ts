import { pool } from "../config/database";

export interface AvanceMateria {
  codigo: string;
  nombre: string;
  semestre: number;
  creditos: number;
  prerrequisitos: string[];
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
  nota: number,
  registradaPor: number
): Promise<void> {
  await pool.query(
    `INSERT INTO calificaciones (usuario_id, codigo_materia, nota, registrada_por)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (usuario_id, codigo_materia)
     DO UPDATE SET nota = EXCLUDED.nota,
                   registrada_por = EXCLUDED.registrada_por,
                   actualizada_en = NOW()`,
    [usuarioId, codigoMateria, nota, registradaPor]
  );
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