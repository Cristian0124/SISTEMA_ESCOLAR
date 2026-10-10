import { HttpError } from "../types/http-error";

export function obtenerTelemetria(): never {
  // TODO: implementar telemetria cuando se defina su origen de datos.
  throw new HttpError(501, "NO_IMPLEMENTADO", "La telemetria aun no esta implementada");
}