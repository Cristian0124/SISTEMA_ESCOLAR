import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const correlacion: RequestHandler = (req,res,next) => {
  const recibida = req.header("x-correlation-id");
  const id = recibida && /^[a-zA-Z0-9_-]{1,64}$/.test(recibida) ? recibida : randomUUID();
  res.locals.correlacion = id;
  res.setHeader("x-correlation-id", id);
  next();
};
