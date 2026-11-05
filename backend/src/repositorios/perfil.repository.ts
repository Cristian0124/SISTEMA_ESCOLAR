import { pool } from '../config/database';
import type { DatosPersonales, HojaDeVida } from '../schemas/perfil.schema';

type Contacto = Omit<DatosPersonales, 'nombre' | 'correo' | 'nacionalidad'>;

export async function consultarDatosPersonales(usuarioId: number) {
  const resultado = await pool.query<{
    nombre: string; correo: string; nacionalidad: string; edad: string;
    estudio: string; contacto: Partial<Contacto>;
  }>(`SELECT u.nombre, u.correo, u.nacionalidad,
    COALESCE(EXTRACT(YEAR FROM age(u.fecha_nacimiento))::text, '') AS edad,
    COALESCE(c.nombre, 'Carrera pendiente de asignación') AS estudio,
    COALESCE(p.datos_contacto, '{}'::jsonb) AS contacto
    FROM usuarios u LEFT JOIN carreras c ON c.codigo = u.carrera_codigo
    LEFT JOIN perfiles_usuarios p ON p.usuario_id = u.id WHERE u.id = $1`, [usuarioId]);
  return resultado.rows[0];
}

export async function guardarDatosPersonales(usuarioId: number, datos: DatosPersonales): Promise<void> {
  const { nombre, correo, nacionalidad, ...contacto } = datos;
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query('UPDATE usuarios SET nombre=$2, correo=$3, nacionalidad=$4 WHERE id=$1',
      [usuarioId, nombre, correo, nacionalidad]);
    await cliente.query(`INSERT INTO perfiles_usuarios(usuario_id, datos_contacto) VALUES($1, $2::jsonb)
      ON CONFLICT(usuario_id) DO UPDATE SET datos_contacto=EXCLUDED.datos_contacto, actualizado_en=NOW()`,
      [usuarioId, JSON.stringify(contacto)]);
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

export async function consultarHojaDeVida(usuarioId: number): Promise<Partial<HojaDeVida> | undefined> {
  const resultado = await pool.query<{ hoja_vida: Partial<HojaDeVida> }>(
    'SELECT hoja_vida FROM perfiles_usuarios WHERE usuario_id=$1', [usuarioId]);
  return resultado.rows[0]?.hoja_vida;
}

export async function guardarHojaDeVida(usuarioId: number, hoja: HojaDeVida): Promise<void> {
  await pool.query(`INSERT INTO perfiles_usuarios(usuario_id, hoja_vida) VALUES($1, $2::jsonb)
    ON CONFLICT(usuario_id) DO UPDATE SET hoja_vida=EXCLUDED.hoja_vida, actualizado_en=NOW()`,
    [usuarioId, JSON.stringify(hoja)]);
}
