import { pool } from '../config/database';
import type { DatosPersonales } from '../schemas/perfil.schema';

type Contacto = Omit<DatosPersonales, 'nombre' | 'correo' | 'nacionalidad' | 'foto'>;

export async function consultarDatosPersonales(usuarioId: number) {
  const resultado = await pool.query<{
    nombre: string; correo: string; nacionalidad: string; edad: string;
    estudio: string; foto: string; contacto: Partial<Contacto>;
  }>(`SELECT u.nombre, u.correo, u.nacionalidad,
    COALESCE(EXTRACT(YEAR FROM age(u.fecha_nacimiento))::text, '') AS edad,
    COALESCE(c.nombre, 'Carrera pendiente de asignación') AS estudio,
    COALESCE(p.hoja_vida->>'foto', '') AS foto,
    COALESCE(p.datos_contacto, '{}'::jsonb) AS contacto
    FROM usuarios u LEFT JOIN carreras c ON c.codigo = u.carrera_codigo
    LEFT JOIN perfiles_usuarios p ON p.usuario_id = u.id WHERE u.id = $1`, [usuarioId]);
  return resultado.rows[0];
}

export async function guardarDatosPersonales(usuarioId: number, datos: DatosPersonales): Promise<void> {
  const { nombre, correo, nacionalidad, foto, ...contacto } = datos;
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query('UPDATE usuarios SET nombre=$2, correo=$3, nacionalidad=$4 WHERE id=$1',
      [usuarioId, nombre, correo, nacionalidad]);
    await cliente.query(`INSERT INTO perfiles_usuarios(usuario_id, datos_contacto, hoja_vida)
      VALUES($1, $2::jsonb, jsonb_strip_nulls(jsonb_build_object('foto', $3::text)))
      ON CONFLICT(usuario_id) DO UPDATE SET datos_contacto=EXCLUDED.datos_contacto,
        hoja_vida=perfiles_usuarios.hoja_vida || EXCLUDED.hoja_vida, actualizado_en=NOW()`,
      [usuarioId, JSON.stringify(contacto), foto ?? null]);
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}
