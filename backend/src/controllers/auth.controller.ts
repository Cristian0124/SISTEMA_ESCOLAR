import type { Request, Response } from "express";
import { z } from "zod";
import { NODE_ENV } from "../config/env";
import {
	cerrarSesion,
	iniciarSesion,
	registrarEstudiante as crearEstudiante,
	registrarUsuarioAdmin as crearUsuarioAdmin,
	listarProfesoresActivos as obtenerProfesoresActivos,
	renovarSesion,
	type Sesion
} from "../services/auth.service";

const opcionesCookie = {
	httpOnly: true,
	sameSite: "strict" as const,
	path: "/api/auth",
	secure: NODE_ENV === "production"
};

function responderConSesion(res: Response, sesion: Sesion) {
	res.cookie("refreshToken", sesion.refreshToken, {
		...opcionesCookie,
		maxAge: 7 * 24 * 60 * 60 * 1000
	});
	return res.status(200).json({ accessToken: sesion.accessToken, usuario: sesion.usuario });
}

export async function login(req: Request, res: Response) {
	const { correo, password } = req.body ?? {};
	const sesion = typeof correo === "string" && typeof password === "string"
	? await iniciarSesion(correo, password)
		: null;

	if (!sesion) {
		return res.status(401).json({
			codigo: "CREDENCIALES_INVALIDAS",
			mensaje: "Correo o contrasena incorrectos"
		});
	}
	return responderConSesion(res, sesion);
}

export async function refresh(req: Request, res: Response) {
 const sesion = await renovarSesion(req.cookies?.refreshToken);
	if (!sesion) {
		return res.status(401).json({
			codigo: "REFRESH_INVALIDO",
			mensaje: "La cookie de renovacion no es valida"
		});
	}
	return responderConSesion(res, sesion);
}

export function logout(req: Request, res: Response) {
	cerrarSesion(req.cookies?.refreshToken);
	res.clearCookie("refreshToken", opcionesCookie);
	return res.status(204).end();
}

const fechaValida = (valor: string) => {
 const fecha = new Date(`${valor}T00:00:00.000Z`);
 return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
};

const camposRegistro = {
 nombre: z.string().trim().min(1).max(150),
 correo: z.string().trim().email().max(254).transform((valor) => valor.toLowerCase()),
 password: z.string().min(8).refine((valor) => Buffer.byteLength(valor, "utf8") <= 72),
 cedula: z.string().trim().min(1).max(32),
 fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(fechaValida),
 fechaIngreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(fechaValida),
 nacionalidad: z.string().trim().min(1).max(100),
 genero: z.string().trim().min(1).max(50)
};

const esquemaRegistro = z.object(camposRegistro).strict();
const esquemaRegistroAdmin = z.object({
	...camposRegistro,
	rol: z.enum(["estudiante", "profesor"]).default("estudiante")
}).strict();

export async function registrarUsuario(req: Request, res: Response) {
	const datos = esquemaRegistroAdmin.safeParse(req.body);
 if (!datos.success) {
  return res.status(400).json({
   codigo: "DATOS_INVALIDOS",
   mensaje: "Revisa los campos requeridos, el correo y la contraseña (mínimo 8 caracteres)",
   errores: datos.error.flatten().fieldErrors
  });
 }

	const { rol, ...datosUsuario } = datos.data;
	const usuario = await crearUsuarioAdmin(datosUsuario, rol);
 if (!usuario) return res.status(409).json({ codigo: "USUARIO_EXISTENTE", mensaje: "El correo o la cédula ya están registrados" });
 const { password_hash: _passwordHash, ...usuarioPublico } = usuario;
	return res.status(201).json({ usuario: usuarioPublico });
}

export async function listarProfesores(_req: Request, res: Response) {
	return res.status(200).json(await obtenerProfesoresActivos());
}

export async function registrarEstudiante(req: Request, res: Response) {
	const datos = esquemaRegistro.safeParse(req.body);
	if (!datos.success) {
		return res.status(400).json({
			codigo: "DATOS_INVALIDOS",
			mensaje: "Revisa los campos requeridos, el correo y la contraseña (mínimo 8 caracteres)",
			errores: datos.error.flatten().fieldErrors
		});
	}

	const usuario = await crearEstudiante(datos.data);
	if (!usuario) return res.status(409).json({ codigo: "USUARIO_EXISTENTE", mensaje: "El correo o la cédula ya están registrados" });
	const { password_hash: _passwordHash, ...usuarioPublico } = usuario;
	return res.status(201).json({ usuario: usuarioPublico });
}
