import { listarCursos } from "../repositorios/cursos.repository";
import { buscarUsuarioPorId } from "../repositorios/auth.repository";
import { asignarDocente as asignarDocenteRepositorio } from "../repositorios/cursos.repository";
import { HttpError } from "../types/http-error";

export function obtenerCursos() {
  return listarCursos();
}

export async function asignarDocente(cursoId: number, profesorId: number) {
  const profesor = await buscarUsuarioPorId(profesorId);
  if (!profesor || !profesor.activo || profesor.rol !== "profesor") {
    throw new HttpError(404, "PROFESOR_NO_ENCONTRADO", "El profesor no existe o está inactivo");
  }

  const actualizado = await asignarDocenteRepositorio(cursoId, profesor.nombre);
  if (!actualizado) {
    throw new HttpError(404, "CURSO_NO_ENCONTRADO", "El curso seleccionado no existe");
  }
  return { cursoId, profesorId: profesor.id, docente: profesor.nombre };
}
