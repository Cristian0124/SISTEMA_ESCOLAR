import type { RequestHandler } from "express";
import { obtenerCursos } from "../services/cursos.service";

export const listarCursos: RequestHandler = async (_req, res, next) => {
  try {
    res.status(200).json(await obtenerCursos());
  } catch (error) {
    next(error);
  }
};

