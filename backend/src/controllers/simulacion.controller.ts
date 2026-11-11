import type { RequestHandler } from "express";
import { consultarSimulacion, iniciarSimulacion } from "../services/simulacion.service";

export const estadoSimulacion: RequestHandler = (_req,res) => {
  res.setHeader("Cache-Control","no-store");
  res.json(consultarSimulacion());
};
export const ejecutarSimulacion: RequestHandler = async (req,res,next) => {
  try { res.status(202).json(await iniciarSimulacion(req.body)); }
  catch (error) { next(error); }
};
