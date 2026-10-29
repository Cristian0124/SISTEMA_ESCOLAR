import { randomUUID } from "node:crypto";
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

const refreshTokensValidos = new Set<string>();

async function emitirSesion(id: number): Promise<Sesion | null> {
 const usuario = await buscarUsuarioPorId(id);
	if (!usuario) return null;

	const usuarioPublico: UsuarioPublico = {
		id: usuario.id,
		nombre: usuario.nombre,
		rol: usuario.rol,
  carreraCodigo: usuario.carreraCodigo
	};
	const accessToken = jwt.sign(usuarioPublico, JWT_ACCESS_SECRET, { expiresIn: "15m" });
	const refreshToken = jwt.sign({ sub: String(usuario.id), jti: randomUUID() }, JWT_REFRESH_SECRET, {
		expiresIn: "7d"
	});
	refreshTokensValidos.add(refreshToken);

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
	if (typeof refreshToken !== "string" || !refreshTokensValidos.has(refreshToken)) return null;

	try {
		const contenido = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
		if (typeof contenido === "string" || typeof contenido.sub !== "string") return null;

		const sesion = await emitirSesion(Number(contenido.sub));
		if (sesion) refreshTokensValidos.delete(refreshToken);
		return sesion;
	} catch {
		refreshTokensValidos.delete(refreshToken);
		return null;
	}
}

export function cerrarSesion(refreshToken: unknown): void {
	if (typeof refreshToken === "string") refreshTokensValidos.delete(refreshToken);
}
