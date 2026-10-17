
import { pool } from "../config/database";

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
  return insertarUsuario(datos, passwordHash, "estudiante");
}

export async function crearUsuarioAdministrado(
  datos: Omit<NuevoEstudiante, "password">,
  passwordHash: string,
  rol: "estudiante" | "profesor"
): Promise<UsuarioAuth | null> {
  return insertarUsuario(datos, passwordHash, rol);
}

export async function crearAdministrador(
  datos: Omit<NuevoEstudiante, "password">,
  passwordHash: string
): Promise<UsuarioAuth | null> {
  return insertarUsuario(datos, passwordHash, "admin");
}

export async function existeAdministrador(): Promise<boolean> {
  const resultado = await pool.query(
    "SELECT 1 FROM usuarios WHERE rol = 'admin' LIMIT 1"
  );
  return resultado.rowCount !== 0;
}

async function insertarUsuario(
  datos: Omit<NuevoEstudiante, "password">,
  passwordHash: string,
  rol: RolUsuario
): Promise<UsuarioAuth | null> {
  try {
    const resultado = await pool.query<UsuarioAuth>(
      `INSERT INTO usuarios (
        nombre, correo, password_hash, rol, activo, cedula,
        fecha_nacimiento, fecha_ingreso, nacionalidad, genero
      ) VALUES ($1, $2, $3, $4, TRUE, $5, $6, $7, $8, $9)
      RETURNING ${columnasUsuario}`,
      [
        datos.nombre,
        datos.correo.trim().toLowerCase(),
        passwordHash,
        rol,
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
