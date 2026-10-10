import type { ErrorRequestHandler, RequestHandler } from "express";
import { HttpError } from "../types/http-error";

export const rutaNoEncontrada: RequestHandler = (_req, res) => {
  res.status(404).json({
    codigo: "RUTA_NO_ENCONTRADA",
    mensaje: "La ruta solicitada no existe"
  });
};

export const manejarError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ codigo: error.codigo, mensaje: error.message });
    return;
  }

  const errorJson = error as { type?: string };
  if (errorJson.type === "entity.parse.failed") {
    res.status(400).json({ codigo: "JSON_INVALIDO", mensaje: "El cuerpo JSON no es valido" });
    return;
  }

  res.status(500).json({ codigo: "ERROR_INTERNO", mensaje: "Error interno del servidor" });
};