import { pool } from '../config/database';
export async function listarFacultades() {
  // Lee el código y el nombre de cada facultad y los ordena por nombre.
  return (await pool.query('SELECT codigo, nombre FROM facultades ORDER BY nombre')).rows;
}

export async function listarCarreras() {
  // JOIN agrega la facultad. LEFT JOIN conserva las carreras que aún no tienen pensum.
  // GROUP BY reúne las filas por carrera para contar materias y sumar créditos.
  // COALESCE convierte la suma nula de una carrera sin materias en cero.
  return (await pool.query(`SELECT c.codigo, c.nombre, c.nivel, c.modalidad,
    c.facultad_codigo AS "facultadCodigo", f.nombre AS facultad,
    c.fuente, c.consultado_en AS "consultadoEn",
    COUNT(m.codigo)::integer AS asignaturas, COALESCE(SUM(m.creditos), 0)::integer AS creditos
    FROM carreras c JOIN facultades f ON f.codigo = c.facultad_codigo
    LEFT JOIN materias_pensum m ON m.carrera_codigo = c.codigo
    GROUP BY c.codigo, f.codigo ORDER BY c.nivel, c.nombre`)).rows;
}

export async function existeCarrera(codigo: string): Promise<boolean> {
  // Busca el código $1. SELECT 1 y rowCount solo comprueban si existe una fila.
  return Boolean((await pool.query('SELECT 1 FROM carreras WHERE codigo=$1', [codigo])).rowCount);
}

export async function consultarPensum(codigo: string) {
  // Une el pensum con materias para obtener sus nombres. $1 es el código de carrera.
  // Ordena las materias por semestre y, dentro de cada semestre, por código.
  return (await pool.query(`SELECT m.codigo, m.nombre, p.semestre, p.creditos
    FROM materias_pensum p JOIN materias m ON m.codigo=p.codigo
    WHERE p.carrera_codigo=$1
    ORDER BY p.semestre, m.codigo`, [codigo])).rows;
}

export async function listarEstudiantesSinCarrera() {
  // IS NULL selecciona estudiantes a los que todavía no se les asignó carrera.
  return (await pool.query(`SELECT id, nombre, cedula FROM usuarios
    WHERE rol='estudiante' AND carrera_codigo IS NULL ORDER BY nombre, id`)).rows;
}

export async function asignarCarreraInicial(usuarioId: number, carreraCodigo: string) {
  // Asigna la carrera $2 al estudiante $1 solo si sigue sin carrera.
  // RETURNING devuelve el identificador y la carrera de la fila que se actualizó.
  const resultado = await pool.query(`UPDATE usuarios SET carrera_codigo=$2
    WHERE id=$1 AND rol='estudiante' AND carrera_codigo IS NULL
    RETURNING id, carrera_codigo AS "carreraCodigo"`, [usuarioId, carreraCodigo]);
  return resultado.rows[0];
}
