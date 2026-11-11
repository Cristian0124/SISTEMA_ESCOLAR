import { validarEstudiante } from "./estudiantes.service";
import { obtenerResumenCreditos } from "../repositorios/creditos.repository";

export async function obtenerMisCreditos(usuarioId: number) {
  await validarEstudiante(usuarioId);
  return obtenerResumenCreditos(usuarioId);
}
