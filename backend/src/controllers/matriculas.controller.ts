import type { RequestHandler, Response } from "express";
import type { UsuarioAutenticado } from "../middlewares/auth.middleware";
import { HttpError } from "../types/http-error";
import {
  crearMatricula as crearMatriculaServicio,
  listarMisMatriculas as listarMisMatriculasServicio,
  listarTodasMatriculasAdministrador as listarTodasMatriculasAdministradorServicio,
  eliminarMatricula as eliminarMatriculaServicio,
  obtenerAvancePensum as obtenerAvancePensumServicio,
  listarMisCalificaciones as listarMisCalificacionesServicio,
  registrarCalificacion as registrarCalificacionServicio,
  listarCursosAsignadosProfesor as listarCursosAsignadosProfesorServicio,
  listarEstudiantesDeCursoProfesor as listarEstudiantesDeCursoProfesorServicio
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

export const listarTodasMatriculasAdministrador: RequestHandler = async (_req, res, next) => {
  try {
    const matriculas = await listarTodasMatriculasAdministradorServicio(obtenerUsuarioId(res));
    res.status(200).json(matriculas);
  } catch (error) {
    next(error);
  }
};

export const obtenerAvancePensum: RequestHandler = async (_req, res, next) => {
  try {
    const usuarioId = obtenerUsuarioId(res);
    const avance = await obtenerAvancePensumServicio(usuarioId);
    res.status(200).json(avance);
  } catch (error) {
    next(error);
  }
};

export const listarMisCalificaciones: RequestHandler = async (_req, res, next) => {
  try {
    const calificaciones = await listarMisCalificacionesServicio(obtenerUsuarioId(res));
    res.status(200).json(calificaciones);
  } catch (error) {
    next(error);
  }
};

export const registrarCalificacion: RequestHandler = async (req, res, next) => {
  try {
    const registradaPor = obtenerUsuarioId(res);
    const usuarioId = Number(req.params.usuarioId);
    const codigoMateria = req.params.codigoMateria;
    const cortes = { corte1: req.body?.corte1, corte2: req.body?.corte2, corte3: req.body?.corte3 };

    if (!esIdValido(usuarioId) || typeof codigoMateria !== "string" || !/^(?:[A-Z]{3}\d{2}|\d{5})$/.test(codigoMateria)) {
      throw new HttpError(400, "DATOS_INVALIDOS", "El estudiante o el código de materia no es válido");
    }
    if (Object.values(cortes).some((corte) => typeof corte !== "number")) {
      throw new HttpError(400, "CORTES_INVALIDOS", "Debes enviar los tres cortes como valores numericos");
    }

    const resultado = await registrarCalificacionServicio(registradaPor, usuarioId, codigoMateria, cortes as { corte1: number; corte2: number; corte3: number });
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const listarCursosDocente: RequestHandler = async (_req, res, next) => {
  try {
    res.status(200).json(await listarCursosAsignadosProfesorServicio(obtenerUsuarioId(res)));
  } catch (error) {
    next(error);
  }
};

export const listarEstudiantesDeCursoDocente: RequestHandler = async (req, res, next) => {
  try {
    const parametro = req.params.cursoId;
    if (typeof parametro !== "string" || !/^[1-9]\d*$/.test(parametro)) {
      throw new HttpError(400, "CURSO_INVALIDO", "El identificador del curso no es válido");
    }
    const cursoId = Number(parametro);
    if (!esIdValido(cursoId)) {
      throw new HttpError(400, "CURSO_INVALIDO", "El identificador del curso no es válido");
    }

    res.status(200).json(await listarEstudiantesDeCursoProfesorServicio(obtenerUsuarioId(res), cursoId));
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
