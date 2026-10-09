
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true"
    ? { rejectUnauthorized: false }
    : undefined
});

export interface UsuarioAuth {
  id: number;
  nombre: string;
  correo: string;
  password_hash: string;
  rol: string;
  activo: boolean;
}

export async function buscarUsuarioPorCorreo(
  correo: string
): Promise<UsuarioAuth | null> {
  const consulta = `
    SELECT id, nombre, correo, password_hash, rol, activo
    FROM usuarios
    WHERE correo = $1
    LIMIT 1
  `;

  const resultado = await pool.query<UsuarioAuth>(
    consulta,
    [correo]
  );

  return resultado.rows[0] ?? null;
}
