import { listarCursos } from "../repositorios/cursos.repository";

export function obtenerCursos() {
  return listarCursos();
}