import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } from "../config/env";
import {
	buscarUsuarioPorCorreo,
	buscarUsuarioPorId,
	crearEstudiante,
	type NuevoEstudiante,
	type RolUsuario,
	type UsuarioAuth
} from "../repositorios/auth.repository";

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

async function emitirSesion(id: number): Promise<Sesion | null> {
 const usuario = await buscarUsuarioPorId(id);
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

export async function iniciarSesion(correo: string, password: string): Promise<Sesion | null> {
 const usuario = await buscarUsuarioPorCorreo(correo);
 if (!usuario || !usuario.activo || !(await bcrypt.compare(password, usuario.password_hash))) return null;

 return emitirSesion(usuario.id);
}

export async function registrarEstudiante(datos: NuevoEstudiante): Promise<UsuarioAuth | null> {
 const { password, ...datosUsuario } = datos;
 const passwordHash = await bcrypt.hash(password, 12);
 return crearEstudiante(datosUsuario, passwordHash);
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
