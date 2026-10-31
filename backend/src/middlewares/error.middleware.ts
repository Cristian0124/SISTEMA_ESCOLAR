import type { ErrorRequestHandler, RequestHandler } from "express";
import { HttpError } from "../types/http-error";
import { randomUUID } from 'node:crypto';

export const rutaNoEncontrada: RequestHandler = (_req, res) => {
  res.status(404).json({
    codigo: "RUTA_NO_ENCONTRADA",
    mensaje: "La ruta solicitada no existe"
  });
};

export const manejarError: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ codigo: error.codigo, mensaje: error.message });
    return;
  }

  const detalle = error && typeof error === 'object' ? error as { type?: string; code?: string; name?: string } : {};
  if (detalle.type === "entity.parse.failed") {
    res.status(400).json({ codigo: "JSON_INVALIDO", mensaje: "El cuerpo JSON no es valido" });
    return;
  }

  if (detalle.type === 'entity.too.large') {
    res.status(413).json({codigo:'ARCHIVO_GRANDE',mensaje:'La información enviada supera el tamaño permitido'});
    return;
  }
  const referencia = randomUUID();
  // No registrar tokens, contraseñas, cuerpos, SQL ni mensajes del driver.
  console.error(JSON.stringify({evento:'error_http',referencia,metodo:req.method,ruta:req.route?.path ?? req.path,
    tipo:detalle.name ?? 'Error',codigo:detalle.code ?? 'DESCONOCIDO'}));
  const conexion = ['ECONNREFUSED','ETIMEDOUT','ENOTFOUND','ECONNRESET','57P01','57P02','57P03','53300','08001','08006'].includes(detalle.code ?? '');
  res.status(conexion ? 503 : 500).json({ codigo: conexion ? 'SERVICIO_NO_DISPONIBLE' : 'ERROR_INTERNO',
    mensaje: conexion ? 'No fue posible conectar con la base de datos. Intenta nuevamente más tarde' : 'Ocurrió un error interno. Intenta nuevamente o contacta a soporte', referencia });
};
