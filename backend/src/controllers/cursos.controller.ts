import type { RequestHandler } from "express";
import { obtenerCursos } from "../services/cursos.service";

export const listarCursos: RequestHandler = (_req, res) => {
  res.status(200).json(obtenerCursos());
};