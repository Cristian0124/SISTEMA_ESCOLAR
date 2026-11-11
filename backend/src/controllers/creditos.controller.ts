import type { RequestHandler } from "express";
import { obtenerMisCreditos as consultar } from "../services/creditos.service";

export const obtenerMisCreditos: RequestHandler = async (_req,res,next) => {
  try { res.json(await consultar(res.locals.usuario.id as number)); }
  catch (error) { next(error); }
};
