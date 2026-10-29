import type { RequestHandler, Response } from "express";
import type { UsuarioAutenticado } from "../middlewares/auth.middleware";
import { HttpError } from "../types/http-error";
import {
  crearSolicitudSoporte,
  listarSolicitudesDelProfesor,
  listarSolicitudesSoporte,
  responderSolicitudSoporte
} from "../repositorios/soporte.repository";

function obtenerUsuarioId(res: Response): number {
  const usuario = res.locals.usuario as UsuarioAutenticado | undefined;
  if (!usuario) throw new HttpError(401, "SESION_REQUERIDA", "Debes iniciar sesión");
  return usuario.id;
}

function validarTexto(valor: unknown, nombre: string): string {
  if (typeof valor !== "string") {
    throw new HttpError(400, "MENSAJE_INVALIDO", `El campo ${nombre} es obligatorio`);
  }
  const texto = valor.trim();
  if (texto.length < 5 || texto.length > 2000) {
    throw new HttpError(400, "MENSAJE_INVALIDO", `El campo ${nombre} debe tener entre 5 y 2000 caracteres`);
  }
  return texto;
}

export const listarMisSolicitudesSoporte: RequestHandler = async (_req, res, next) => {
  try {
    res.status(200).json(await listarSolicitudesDelProfesor(obtenerUsuarioId(res)));
  } catch (error) {
    next(error);
  }
};

export const crearSolicitudSoporteDocente: RequestHandler = async (req, res, next) => {
  try {
    const mensaje = validarTexto(req.body?.mensaje, "mensaje");
    await crearSolicitudSoporte(obtenerUsuarioId(res), mensaje);
    res.status(201).json({ mensaje: "Mensaje enviado a soporte" });
  } catch (error) {
    next(error);
  }
};

export const listarSolicitudesSoporteAdmin: RequestHandler = async (_req, res, next) => {
  try {
    res.status(200).json(await listarSolicitudesSoporte());
  } catch (error) {
    next(error);
  }
};

export const responderSolicitudSoporteAdmin: RequestHandler = async (req, res, next) => {
  try {
    const parametro = req.params.id;
    if (typeof parametro !== "string" || !/^[1-9]\d*$/.test(parametro)) {
      throw new HttpError(400, "SOLICITUD_INVALIDA", "El identificador de solicitud no es válido");
    }
    const respuesta = validarTexto(req.body?.respuesta, "respuesta");
    const actualizada = await responderSolicitudSoporte(
      Number(parametro),
      obtenerUsuarioId(res),
      respuesta
    );
    if (!actualizada) throw new HttpError(409, "SOLICITUD_RESPONDIDA", "La solicitud ya fue respondida o no existe");
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
