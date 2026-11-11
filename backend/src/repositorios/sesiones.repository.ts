import { pool } from "../config/database";
import type { UsuarioAuth } from "./auth.repository";

export async function crearSesion(usuarioId: number, hash: string, vencimiento: Date): Promise<boolean> {
  // INSERT ... SELECT crea la sesión solo si el usuario $1 está activo.
  // $2 es el hash del token de renovación y $3 el vencimiento. RETURNING confirma el alta.
  const resultado = await pool.query(
    `INSERT INTO sesiones_auth (usuario_id, refresh_hash, vence_en)
     SELECT id, $2, $3 FROM usuarios WHERE id = $1 AND activo = TRUE
     RETURNING id`, [usuarioId, hash, vencimiento]
  );
  return resultado.rowCount === 1;
}

export async function rotarSesion(
  usuarioId: number, hashAnterior: string, hashNuevo: string, vencimiento: Date
): Promise<UsuarioAuth | null> {
  const cliente = await pool.connect();
  try {
    // Abre la transacción que verifica al usuario y renueva su sesión con la misma conexión.
    await cliente.query("BEGIN");
    // $1 identifica al usuario. FOR SHARE mantiene estable su fila durante la renovación.
    // Impide desactivar/borrar al usuario mientras se autoriza la renovación.
    const usuario = await cliente.query<UsuarioAuth>(
      `SELECT id, nombre, correo, password_hash, rol, activo, carrera_codigo AS "carreraCodigo"
       FROM usuarios WHERE id = $1 AND activo = TRUE FOR SHARE`, [usuarioId]
    );
    if (!usuario.rows[0]) {
      await cliente.query("ROLLBACK");
      return null;
    }
    // $1 identifica al usuario y $2 es el hash anterior. Solo cambia sesiones vigentes y sin revocar.
    // La actualización guarda el nuevo hash $3 y el vencimiento $4.
    // Compare-and-swap: PostgreSQL vuelve a evaluar el hash tras esperar un
    // UPDATE concurrente. Solo una petición puede consumir el hash anterior.
    const actualizada = await cliente.query(
      `UPDATE sesiones_auth SET refresh_hash = $3, vence_en = $4
       WHERE usuario_id = $1 AND refresh_hash = $2
         AND revocada_en IS NULL AND vence_en > clock_timestamp()
       RETURNING id`, [usuarioId, hashAnterior, hashNuevo, vencimiento]
    );
    // Cierra la transacción. Si el UPDATE no encontró una sesión válida, se devuelve null.
    await cliente.query("COMMIT");
    return actualizada.rowCount === 1 ? usuario.rows[0] : null;
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}

export async function revocarSesion(hash: string): Promise<void> {
  // Marca la fecha de revocación de la sesión con hash $1 si todavía no fue revocada.
  await pool.query(
    `UPDATE sesiones_auth SET revocada_en = clock_timestamp()
     WHERE refresh_hash = $1 AND revocada_en IS NULL`, [hash]
  );
}
