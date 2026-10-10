import type { RequestHandler } from "express";
import {
  crearMatricula as crearMatriculaServicio,
  eliminarMatricula as eliminarMatriculaServicio,
  listarMisMatriculas as listarMisMatriculasServicio
} from "../services/matriculas.service";

export const crearMatricula: RequestHandler = (_req, _res) => crearMatriculaServicio();
export const listarMisMatriculas: RequestHandler = (_req, _res) => listarMisMatriculasServicio();
export const eliminarMatricula: RequestHandler = (_req, _res) => eliminarMatriculaServicio();