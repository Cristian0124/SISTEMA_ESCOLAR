import type { RequestHandler, Response } from "express";
import type { UsuarioAutenticado } from "../middlewares/auth.middleware";
import { HttpError } from "../types/http-error";
import {
  obtenerMisCreditos as obtenerMisCreditosServicio,
  solicitarCreditosAdicionales as solicitarCreditosAdicionalesServicio,
  listarSolicitudesCreditosAdministrador,
  revisarSolicitudCreditosAdministrador
} from "../services/matriculas.service";

function usuarioId(res: Response): number {
  const usuario = res.locals.usuario as UsuarioAutenticado | undefined;
  if (!usuario) throw new HttpError(401, "SESION_REQUERIDA", "Debes iniciar sesión");
  return usuario.id;
}

export const obtenerMisCreditos: RequestHandler = async (_req, res, next) => {
  try {
    res.status(200).json(await obtenerMisCreditosServicio(usuarioId(res)));
  } catch (error) {
    next(error);
  }
};

export const solicitarCreditosAdicionales: RequestHandler = async (req, res, next) => {
  try {
    const creditos: unknown = req.body?.creditos;
    const motivo: unknown = req.body?.motivo;
    if (typeof creditos !== "number" || typeof motivo !== "string") {
      throw new HttpError(400, "SOLICITUD_INVALIDA", "Indica la cantidad de créditos y el motivo de la solicitud");
    }
    await solicitarCreditosAdicionalesServicio(usuarioId(res), creditos, motivo);
    res.status(201).json({ mensaje: "Solicitud enviada para revisión" });
  } catch (error) {
    next(error);
  }
};

export const listarSolicitudes: RequestHandler = async (_req, res, next) => {
  try {
    res.status(200).json(await listarSolicitudesCreditosAdministrador(usuarioId(res)));
  } catch (error) {
    next(error);
  }
};

export const revisarSolicitud: RequestHandler = async (req, res, next) => {
  try {
    const parametro = req.params.id;
    const decision = req.body?.decision;
    if (typeof parametro !== "string" || !/^[1-9]\d*$/.test(parametro)) {
      throw new HttpError(400, "SOLICITUD_INVALIDA", "El identificador de solicitud no es válido");
    }
    if (decision !== "Aprobada" && decision !== "Rechazada") {
      throw new HttpError(400, "DECISION_INVALIDA", "La decisión debe ser Aprobada o Rechazada");
    }
    await revisarSolicitudCreditosAdministrador(usuarioId(res), Number(parametro), decision);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
