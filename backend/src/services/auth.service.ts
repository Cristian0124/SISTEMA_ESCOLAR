import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } from "../config/env";
import { buscarUsuarioPorCorreo, buscarUsuarioPorId, type RolUsuario } from "../repositorios/usuarios.repository";

export interface UsuarioPublico {
	id: number;
	nombre: string;
	rol: RolUsuario;
}

export interface Sesion {
	accessToken: string;
	refreshToken: string;
	usuario: UsuarioPublico;
}

const refreshTokensValidos = new Set<string>();

function emitirSesion(id: number): Sesion | null {
	const usuario = buscarUsuarioPorId(id);
	if (!usuario) return null;

	const usuarioPublico: UsuarioPublico = {
		id: usuario.id,
		nombre: usuario.nombre,
		rol: usuario.rol
	};
	const accessToken = jwt.sign(usuarioPublico, JWT_ACCESS_SECRET, { expiresIn: "15m" });
	const refreshToken = jwt.sign({ sub: String(usuario.id), jti: randomUUID() }, JWT_REFRESH_SECRET, {
		expiresIn: "7d"
	});
	refreshTokensValidos.add(refreshToken);

	return { accessToken, refreshToken, usuario: usuarioPublico };
}

export function iniciarSesion(correo: string, password: string): Sesion | null {
	const usuario = buscarUsuarioPorCorreo(correo);
	// TODO: hash con Argon2id/bcrypt.
	if (!usuario || usuario.password !== password) return null;

	return emitirSesion(usuario.id);
}

export function renovarSesion(refreshToken: unknown): Sesion | null {
	if (typeof refreshToken !== "string" || !refreshTokensValidos.has(refreshToken)) return null;

	try {
		const contenido = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
		if (typeof contenido === "string" || typeof contenido.sub !== "string") return null;

		const sesion = emitirSesion(Number(contenido.sub));
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
