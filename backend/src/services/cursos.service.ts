import { listarCursos } from "../repositorios/cursos.repository";
import { buscarUsuarioPorId } from "../repositorios/auth.repository";
import { asignarDocente as asignarDocenteRepositorio, crearCurso as crearCursoRepositorio } from "../repositorios/cursos.repository";
import { HttpError } from "../types/http-error";
import { normalizarSesiones, describirHorario, type SesionCurso } from './horarios.service';

export function obtenerCursos() {
  return listarCursos();
}

export async function asignarDocente(cursoId: number, profesorId: number) {
  const profesor = await buscarUsuarioPorId(profesorId);
  if (!profesor || !profesor.activo || profesor.rol !== "profesor") {
    throw new HttpError(404, "PROFESOR_NO_ENCONTRADO", "El profesor no existe o está inactivo");
  }

  const actualizado = await asignarDocenteRepositorio(cursoId, profesor.id);
  if (!actualizado) {
    throw new HttpError(404, "CURSO_NO_ENCONTRADO", "El curso seleccionado no existe");
  }
  return { cursoId, profesorId: profesor.id, docente: profesor.nombre };
}

export async function crearCursoYAsignarDocente(datos: {
  codigoPensum: string;
  profesorId: number;
  horario?: string;
  sesiones?: SesionCurso[];
  cuposTotales: number;
}) {
  const profesor = await buscarUsuarioPorId(datos.profesorId);
  if (!profesor || !profesor.activo || profesor.rol !== "profesor") {
    throw new HttpError(404, "PROFESOR_NO_ENCONTRADO", "El profesor no existe o está inactivo");
  }

  const sesiones = normalizarSesiones(datos.sesiones, datos.horario);
  const curso = await crearCursoRepositorio(
    datos.codigoPensum,
    profesor.id,
    describirHorario(sesiones),
    datos.cuposTotales,
    sesiones
  );
  if (!curso) {
    throw new HttpError(400, "ASIGNATURA_SIN_CARRERA", "La asignatura debe pertenecer a una carrera y facultad del catálogo");
  }
  return curso;
}
