import type { RequestHandler } from "express";
import { asignarDocente as asignarDocenteServicio, obtenerCursos } from "../services/cursos.service";
import { HttpError } from "../types/http-error";

export const listarCursos: RequestHandler = async (_req, res, next) => {
  try {
    res.status(200).json(await obtenerCursos());
  } catch (error) {
    next(error);
  }
};

export const asignarDocente: RequestHandler = async (req, res, next) => {
  try {
    const cursoId = Number(req.params.id);
    const profesorId: unknown = req.body?.profesorId;
    if (!Number.isSafeInteger(cursoId) || cursoId <= 0
      || typeof profesorId !== "number" || !Number.isSafeInteger(profesorId) || profesorId <= 0) {
      throw new HttpError(400, "ASIGNACION_INVALIDA", "Selecciona un curso y un profesor válidos");
    }

    res.status(200).json(await asignarDocenteServicio(cursoId, profesorId));
  } catch (error) {
    next(error);
  }
};

