import { HttpError } from "../types/http-error";
import { buscarUsuarioPorId } from "../repositorios/auth.repository";
import { buscarCursoPorId, listarCursos } from "../repositorios/cursos.repository";
import * as repositorio from "../repositorios/matriculas.repository";
import { validarEstudiante } from './estudiantes.service';

async function obtenerCursoAsignado(profesorId: number, cursoId: number) {
  const profesor = await buscarUsuarioPorId(profesorId);
  if (!profesor || !profesor.activo || profesor.rol !== "profesor") {
    throw new HttpError(403, "ACCESO_DENEGADO", "Solo los profesores pueden consultar sus cursos asignados");
  }

  const curso = await buscarCursoPorId(cursoId);
  if (!curso || curso.docenteId !== profesor.id) {
    throw new HttpError(403, "CURSO_NO_ASIGNADO", "No tienes asignado este curso");
  }
  return curso;
}

export async function listarCursosAsignadosProfesor(profesorId: number) {
  const profesor = await buscarUsuarioPorId(profesorId);
  if (!profesor || !profesor.activo || profesor.rol !== "profesor") {
    throw new HttpError(403, "ACCESO_DENEGADO", "Solo los profesores pueden consultar sus cursos asignados");
  }

  return (await listarCursos()).filter((curso) => curso.docenteId === profesor.id);
}

export async function listarEstudiantesDeCursoProfesor(profesorId: number, cursoId: number) {
  const curso = await obtenerCursoAsignado(profesorId, cursoId);
  return repositorio.listarEstudiantesPorCurso(curso.id, curso.codigoPensum);
}

export async function crearMatricula(
  usuarioId: number,
  cursoId: number
) {
  await validarEstudiante(usuarioId);

  const curso = await buscarCursoPorId(cursoId);

  if (!curso) {
    throw new HttpError(
      404,
      "CURSO_NO_ENCONTRADO",
      "El curso seleccionado no existe"
    );
  }

  return repositorio.crearMatricula(usuarioId, curso);
}

export async function listarMisMatriculas(usuarioId: number) {
  await validarEstudiante(usuarioId);

  return repositorio.listarPorEstudiante(usuarioId);
}

export async function listarTodasMatriculasAdministrador(administradorId: number) {
  const administrador = await buscarUsuarioPorId(administradorId);
  if (!administrador || !administrador.activo || administrador.rol !== "admin") {
    throw new HttpError(403, "ACCESO_DENEGADO", "Solo los administradores pueden consultar todas las matrículas");
  }
  return repositorio.listarTodasDelPeriodo();
}

export async function eliminarMatricula(
  usuarioId: number,
  matriculaId: number
) {
  await validarEstudiante(usuarioId);

  const eliminada = await repositorio.eliminarMatricula(
    usuarioId,
    matriculaId
  );

  if (!eliminada) {
    throw new HttpError(
      404,
      "MATRICULA_NO_ENCONTRADA",
      "La matrícula no existe o no pertenece a tu usuario"
    );
  }
}
