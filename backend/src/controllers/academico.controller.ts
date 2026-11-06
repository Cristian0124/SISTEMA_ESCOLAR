import type { RequestHandler } from 'express';
import * as servicio from '../services/academico.service';
import * as prerrequisitos from '../services/prerrequisitos.service';

export const listarFacultades: RequestHandler = async (_req, res) => {
  res.json(await servicio.listarFacultades());
};

export const listarCarreras: RequestHandler = async (_req, res) => {
  res.json(await servicio.listarCarreras());
};

export const consultarPensum: RequestHandler = async (req, res) => {
  res.json(await servicio.consultarPensum(String(req.params.codigo)));
};

export const listarEstudiantesSinCarrera: RequestHandler = async (_req, res) => {
  res.json(await servicio.listarEstudiantesSinCarrera());
};

export const asignarCarreraInicial: RequestHandler = async (req, res) => {
  res.json(await servicio.asignarCarreraInicial(Number(req.params.id), req.body));
};

export const consultarPrerrequisitos: RequestHandler = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await prerrequisitos.consultarRevision(String(req.params.codigo)));
};

export const guardarPrerrequisitos: RequestHandler = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await prerrequisitos.guardarRevision(String(req.params.codigo), req.body));
};
