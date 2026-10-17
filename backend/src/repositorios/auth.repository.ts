
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
  rol: RolUsuario;
  activo: boolean;
}

export type RolUsuario = "estudiante" | "profesor" | "admin";

export interface NuevoEstudiante {
  nombre: string;
  correo: string;
  password: string;
  cedula: string;
  fechaNacimiento: string;
  fechaIngreso: string;
  nacionalidad: string;
  genero: string;
}

const columnasUsuario = `
  id, nombre, correo, password_hash, rol, activo,
  cedula, fecha_nacimiento, fecha_ingreso, nacionalidad, genero
`;

export async function buscarUsuarioPorCorreo(
  correo: string
): Promise<UsuarioAuth | null> {
  const consulta = `
    SELECT ${columnasUsuario}
    FROM usuarios
    WHERE LOWER(BTRIM(correo)) = $1
    LIMIT 1
  `;

  const resultado = await pool.query<UsuarioAuth>(
    consulta,
    [correo.trim().toLowerCase()]
  );

  return resultado.rows[0] ?? null;
}

export async function buscarUsuarioPorId(id: number): Promise<UsuarioAuth | null> {
  const resultado = await pool.query<UsuarioAuth>(
    `SELECT ${columnasUsuario} FROM usuarios WHERE id = $1 LIMIT 1`,
    [id]
  );

  return resultado.rows[0] ?? null;
}

export async function crearEstudiante(
  datos: Omit<NuevoEstudiante, "password">,
  passwordHash: string
): Promise<UsuarioAuth | null> {
  try {
    const resultado = await pool.query<UsuarioAuth>(
      `INSERT INTO usuarios (
        nombre, correo, password_hash, rol, activo, cedula,
        fecha_nacimiento, fecha_ingreso, nacionalidad, genero
      ) VALUES ($1, $2, $3, 'estudiante', TRUE, $4, $5, $6, $7, $8)
      RETURNING ${columnasUsuario}`,
      [
        datos.nombre,
        datos.correo.trim().toLowerCase(),
        passwordHash,
        datos.cedula.trim(),
        datos.fechaNacimiento,
        datos.fechaIngreso,
        datos.nacionalidad,
        datos.genero
      ]
    );

    return resultado.rows[0] ?? null;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return null;
    }
    throw error;
  }
}
