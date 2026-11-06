import type { RequestHandler } from 'express';
import type { UsuarioAutenticado } from '../middlewares/auth.middleware';
import * as servicio from '../services/perfil.service';

export const consultarDatos: RequestHandler = async (_req, res) => {
  res.json(await servicio.consultarDatos((res.locals.usuario as UsuarioAutenticado).id));
};

export const guardarDatos: RequestHandler = async (req, res) => {
  res.json(await servicio.guardarDatos((res.locals.usuario as UsuarioAutenticado).id, req.body));
};
