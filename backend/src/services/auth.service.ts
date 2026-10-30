import { createHash, randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } from "../config/env";
import {
	buscarUsuarioPorCorreo,
	buscarUsuarioPorId,
	listarProfesoresActivos as listarProfesoresActivosRepositorio,
	crearEstudiante,
	crearUsuarioAdministrado,
	type NuevoEstudiante,
	type RolUsuario,
	type UsuarioAuth
} from "../repositorios/auth.repository";

import { pool } from "../config/database";
import { HttpError } from "../types/http-error";
import { crearSesion, rotarSesion, revocarSesion } from "../repositorios/sesiones.repository";

export async function validarCarrera(codigo: string | null | undefined) {
 if (!codigo || !(await pool.query("SELECT 1 FROM carreras WHERE codigo = $1", [codigo])).rowCount) {
  throw new HttpError(400, "CARRERA_INVALIDA", "Selecciona una carrera de Ingenieria");
 }
}

export interface UsuarioPublico {
	id: number;
	nombre: string;
	rol: RolUsuario;
 carreraCodigo: string | null;
}

export interface Sesion {
	accessToken: string;
	refreshToken: string;
	usuario: UsuarioPublico;
}

function hashToken(token: string): string {
 return createHash("sha256").update(token).digest("hex");
}

function crearRefreshToken(id: number) {
 const vencimiento = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
 const token = jwt.sign({ sub: String(id), jti: randomUUID(), exp: vencimiento }, JWT_REFRESH_SECRET);
 return { token, vencimiento: new Date(vencimiento * 1000) };
}

async function emitirSesion(id: number): Promise<Sesion | null> {
 const usuario = await buscarUsuarioPorId(id);
 if (!usuario || !usuario.activo) return null;

 const refresh = crearRefreshToken(usuario.id);
 if (!(await crearSesion(usuario.id, hashToken(refresh.token), refresh.vencimiento))) return null;
 return construirSesion(usuario, refresh.token);
}

function construirSesion(usuario: UsuarioAuth, refreshToken: string): Sesion {

	const usuarioPublico: UsuarioPublico = {
		id: usuario.id,
		nombre: usuario.nombre,
		rol: usuario.rol,
  carreraCodigo: usuario.carreraCodigo
	};
	const accessToken = jwt.sign(usuarioPublico, JWT_ACCESS_SECRET, { expiresIn: "15m" });

	return { accessToken, refreshToken, usuario: usuarioPublico };
}

export async function iniciarSesion(correo: string, password: string): Promise<Sesion | null> {
 const usuario = await buscarUsuarioPorCorreo(correo);
 if (!usuario || !usuario.activo || !(await bcrypt.compare(password, usuario.password_hash))) return null;

 return emitirSesion(usuario.id);
}

export async function registrarEstudiante(datos: NuevoEstudiante): Promise<UsuarioAuth | null> {
 await validarCarrera(datos.carreraCodigo);
 const { password, ...datosUsuario } = datos;
 const passwordHash = await bcrypt.hash(password, 12);
 return crearEstudiante(datosUsuario, passwordHash);
}

export async function registrarUsuarioAdmin(
	datos: NuevoEstudiante,
	rol: "estudiante" | "profesor"
): Promise<UsuarioAuth | null> {
	if (rol === "estudiante") await validarCarrera(datos.carreraCodigo);
	const { password, ...datosUsuario } = datos;
	const passwordHash = await bcrypt.hash(password, 12);
	return crearUsuarioAdministrado(datosUsuario, passwordHash, rol);
}

export function listarProfesoresActivos() {
	return listarProfesoresActivosRepositorio();
}

export async function renovarSesion(refreshToken: unknown): Promise<Sesion | null> {
 if (typeof refreshToken !== "string") return null;
 let contenido: jwt.JwtPayload | string;
 try {
  contenido = jwt.verify(refreshToken, JWT_REFRESH_SECRET, { algorithms: ["HS256"] });
 } catch { return null; }
 if (typeof contenido === "string" || typeof contenido.sub !== "string"
   || !/^[1-9]\d*$/.test(contenido.sub) || typeof contenido.exp !== "number"
   || typeof contenido.jti !== "string") return null;
 const usuarioId = Number(contenido.sub);
 if (!Number.isSafeInteger(usuarioId) || usuarioId > 2147483647) return null;
 const nuevo = crearRefreshToken(usuarioId);
 const usuario = await rotarSesion(usuarioId, hashToken(refreshToken), hashToken(nuevo.token), nuevo.vencimiento);
 return usuario ? construirSesion(usuario, nuevo.token) : null;
}

export async function cerrarSesion(refreshToken: unknown): Promise<void> {
 if (typeof refreshToken === "string") await revocarSesion(hashToken(refreshToken));
}
