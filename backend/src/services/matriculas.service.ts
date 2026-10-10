import { HttpError } from "../types/http-error";

function noImplementado(): never {
  // TODO: implementar las operaciones de matricula cuando se defina su persistencia.
  throw new HttpError(501, "NO_IMPLEMENTADO", "La operacion de matricula aun no esta implementada");
}

export function crearMatricula(): never {
  return noImplementado();
}

export function listarMisMatriculas(): never {
  return noImplementado();
}

export function eliminarMatricula(): never {
  return noImplementado();
}