import type { Request, Response } from "express";
import { NODE_ENV } from "../config/env";
import { cerrarSesion, iniciarSesion, renovarSesion } from "../services/auth.service";

const opcionesCookie = {
	httpOnly: true,
	sameSite: "strict" as const,
	path: "/api/auth",
	secure: NODE_ENV === "production"
};

function responderConSesion(res: Response, sesion: NonNullable<ReturnType<typeof iniciarSesion>>) {
	res.cookie("refreshToken", sesion.refreshToken, {
		...opcionesCookie,
		maxAge: 7 * 24 * 60 * 60 * 1000
	});
	return res.status(200).json({ accessToken: sesion.accessToken, usuario: sesion.usuario });
}

export function login(req: Request, res: Response) {
	const { correo, password } = req.body ?? {};
	const sesion = typeof correo === "string" && typeof password === "string"
		? iniciarSesion(correo, password)
		: null;

	if (!sesion) {
		return res.status(401).json({
			codigo: "CREDENCIALES_INVALIDAS",
			mensaje: "Correo o contrasena incorrectos"
		});
	}
	return responderConSesion(res, sesion);
}

export function refresh(req: Request, res: Response) {
	const sesion = renovarSesion(req.cookies?.refreshToken);
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
