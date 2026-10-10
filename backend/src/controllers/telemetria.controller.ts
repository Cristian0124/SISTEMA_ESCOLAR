import type { RequestHandler } from "express";
import { obtenerTelemetria } from "../services/telemetria.service";

export const consultarTelemetria: RequestHandler = (_req, _res) => obtenerTelemetria();