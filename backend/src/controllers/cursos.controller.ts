import type { RequestHandler } from "express";
import type { UsuarioAutenticado } from "../middlewares/auth.middleware";
import { listarCursosAsignadosProfesor } from "../services/matriculas.service";
import { asignarDocente as asignarDocenteServicio, crearCursoYAsignarDocente, obtenerCursos } from "../services/cursos.service";
import { listarCursos as listarCursosEstudiante } from "../repositorios/cursos.repository";
import { HttpError } from "../types/http-error";
import { z } from "zod";
import { esquemaSesiones } from '../services/horarios.service';

export const listarCursos: RequestHandler = async (_req, res, next) => {
  try {
    const usuario = res.locals.usuario as UsuarioAutenticado | undefined;
    if (usuario?.rol === "profesor") {
      res.status(200).json(await listarCursosAsignadosProfesor(usuario.id));
      return;
    }
    res.status(200).json(usuario?.rol === "estudiante" ? await listarCursosEstudiante(usuario.id) : await obtenerCursos());
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

export const crearCurso: RequestHandler = async (req, res, next) => {
  try {
    const datos = z.object({
      codigoPensum: z.string().regex(/^[A-Z0-9]{5}$/),
      profesorId: z.number().int().positive(),
      horario: z.string().trim().min(1).max(1000).optional(),
      sesiones: esquemaSesiones.optional(),
      cuposTotales: z.number().int().min(1).max(5000)
    }).strict().safeParse(req.body);
    if (!datos.success) {
      throw new HttpError(400, "DATOS_CURSO_INVALIDOS", "Selecciona una asignatura, un profesor, un horario y cupos válidos");
    }
    res.status(201).json(await crearCursoYAsignarDocente(datos.data));
  } catch (error) {
    next(error);
  }
};

