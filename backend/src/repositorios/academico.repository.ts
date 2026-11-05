import { pool } from '../config/database';

export async function listarFacultades() {
  return (await pool.query('SELECT codigo, nombre FROM facultades ORDER BY nombre')).rows;
}

export async function listarCarreras() {
  return (await pool.query(`SELECT c.codigo, c.nombre, c.nivel, c.modalidad,
    c.facultad_codigo AS "facultadCodigo", f.nombre AS facultad,
    c.fuente, c.consultado_en AS "consultadoEn",
    c.prerrequisitos_verificados AS "prerrequisitosVerificados",
    COUNT(m.codigo)::integer AS asignaturas, COALESCE(SUM(m.creditos), 0)::integer AS creditos
    FROM carreras c JOIN facultades f ON f.codigo = c.facultad_codigo
    LEFT JOIN materias_pensum m ON m.carrera_codigo = c.codigo
    GROUP BY c.codigo, f.codigo ORDER BY c.nivel, c.nombre`)).rows;
}

export async function existeCarrera(codigo: string): Promise<boolean> {
  return Boolean((await pool.query('SELECT 1 FROM carreras WHERE codigo=$1', [codigo])).rowCount);
}

export async function consultarPensum(codigo: string) {
  return (await pool.query(`SELECT codigo, nombre, semestre, creditos FROM materias_pensum
    WHERE carrera_codigo=$1 ORDER BY semestre, codigo`, [codigo])).rows;
}

export async function listarEstudiantesSinCarrera() {
  return (await pool.query(`SELECT id, nombre, cedula FROM usuarios
    WHERE rol='estudiante' AND carrera_codigo IS NULL ORDER BY nombre, id`)).rows;
}

export async function asignarCarreraInicial(usuarioId: number, carreraCodigo: string) {
  const resultado = await pool.query(`UPDATE usuarios SET carrera_codigo=$2
    WHERE id=$1 AND rol='estudiante' AND carrera_codigo IS NULL
    RETURNING id, carrera_codigo AS "carreraCodigo"`, [usuarioId, carreraCodigo]);
  return resultado.rows[0];
}
