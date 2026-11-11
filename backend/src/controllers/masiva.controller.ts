import type { RequestHandler } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { validarEstudiante } from "../services/estudiantes.service";
import { buscarCursoPorId } from "../repositorios/cursos.repository";
import { encolarSolicitud, listarSolicitudes, consultarSolicitud } from "../repositorios/solicitudes.repository";
import { consultarPeriodo, configurarPeriodo } from "../services/periodos.service";
import { consultarMetricas } from "../monitoreo/metricas";
import { HttpError } from "../types/http-error";

const entrada = z.object({ cursoId:z.number().int().positive().max(2147483647) }).strict();
export const solicitarMatricula: RequestHandler = async (req,res,next) => {
  try {
    const datos = entrada.safeParse(req.body);
    const clave = req.header("Idempotency-Key") ?? randomUUID();
    if (!datos.success || !z.string().uuid().safeParse(clave).success) {
      throw new HttpError(400,"DATOS_INVALIDOS","Envía un cursoId válido y una clave de idempotencia UUID.");
    }
    const usuarioId = res.locals.usuario.id as number;
    await validarEstudiante(usuarioId);
    if (!await buscarCursoPorId(datos.data.cursoId)) throw new HttpError(404,"CURSO_NO_ENCONTRADO","El curso no existe.");
    const solicitud = await encolarSolicitud(usuarioId,datos.data.cursoId,clave,res.locals.correlacion as string);
    res.status(["confirmada","rechazada"].includes(solicitud.estado) ? 200:202).json({
      id:solicitud.id,estado:solicitud.estado,curso_id:solicitud.curso_id,motivo:solicitud.motivo,matricula_id:solicitud.matricula_id
    });
  } catch (error) { next(error); }
};
export const misSolicitudes: RequestHandler = async (_req,res,next) => {
  try { res.json(await listarSolicitudes(res.locals.usuario.id as number)); } catch (error) { next(error); }
};
export const miSolicitud: RequestHandler = async (req,res,next) => {
  try {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) throw new HttpError(400,"ID_INVALIDO","Identificador de solicitud inválido.");
    const solicitud = await consultarSolicitud(id.data,res.locals.usuario.id as number);
    if (!solicitud) throw new HttpError(404,"SOLICITUD_NO_ENCONTRADA","No se encontró la solicitud.");
    res.json(solicitud);
  } catch (error) { next(error); }
};
export const verPeriodo: RequestHandler = async (_req,res,next) => {
  try { res.json(await consultarPeriodo()); } catch (error) { next(error); }
};
export const editarPeriodo: RequestHandler = async (req,res,next) => {
  try { res.json(await configurarPeriodo(req.body)); } catch (error) { next(error); }
};
export const verMetricas: RequestHandler = async (_req,res,next) => {
  try { res.setHeader("Cache-Control","no-store"); res.json(await consultarMetricas()); } catch (error) { next(error); }
};
