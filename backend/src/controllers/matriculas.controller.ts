import type { RequestHandler, Response } from "express";
import type { UsuarioAutenticado } from "../middlewares/auth.middleware";
import { HttpError } from "../types/http-error";
import {
  crearMatricula as crearMatriculaServicio,
  listarMisMatriculas as listarMisMatriculasServicio,
  eliminarMatricula as eliminarMatriculaServicio
} from "../services/matriculas.service";

function obtenerUsuarioId(res: Response): number {
  const usuario = res.locals.usuario as
    | UsuarioAutenticado
    | undefined;

  if (!usuario) {
    throw new HttpError(
      401,
      "SESION_REQUERIDA",
      "Debes iniciar sesión"
    );
  }

  return usuario.id;
}

function esIdValido(valor: unknown): valor is number {
  return (
    typeof valor === "number" &&
    Number.isSafeInteger(valor) &&
    valor > 0 &&
    valor <= 2147483647
  );
}

export const crearMatricula: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const usuarioId = obtenerUsuarioId(res);
    const cursoId: unknown = req.body?.cursoId;

    if (!esIdValido(cursoId)) {
      throw new HttpError(
        400,
        "CURSO_INVALIDO",
        "Debes enviar un cursoId numérico válido"
      );
    }

    const resultado = await crearMatriculaServicio(
      usuarioId,
      cursoId
    );

    // Un reintento de una matrícula existente no crea duplicados.
    res
      .status(resultado.creada ? 201 : 200)
      .json(resultado.matricula);
  } catch (error) {
    next(error);
  }
};

export const listarMisMatriculas: RequestHandler = async (
  _req,
  res,
  next
) => {
  try {
    const usuarioId = obtenerUsuarioId(res);
    const matriculas = await listarMisMatriculasServicio(usuarioId);

    // El frontend espera directamente un arreglo.
    res.status(200).json(matriculas);
  } catch (error) {
    next(error);
  }
};

export const eliminarMatricula: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const usuarioId = obtenerUsuarioId(res);
    const parametro = req.params.id;

    if (
      typeof parametro !== "string" ||
      !/^[1-9]\d*$/.test(parametro)
    ) {
      throw new HttpError(
        400,
        "MATRICULA_INVALIDA",
        "El identificador de matrícula no es válido"
      );
    }

    const matriculaId = Number(parametro);

    if (!esIdValido(matriculaId)) {
      throw new HttpError(
        400,
        "MATRICULA_INVALIDA",
        "El identificador de matrícula no es válido"
      );
    }

    await eliminarMatriculaServicio(usuarioId, matriculaId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};