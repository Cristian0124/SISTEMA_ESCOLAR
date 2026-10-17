import { HttpError } from "../types/http-error";
import { buscarUsuarioPorId } from "../repositorios/auth.repository";
import { listarCursos } from "../repositorios/cursos.repository";
import * as repositorio from "../repositorios/matriculas.repository";

async function validarEstudiante(usuarioId: number): Promise<void> {
  const usuario = await buscarUsuarioPorId(usuarioId);

  if (!usuario || !usuario.activo) {
    throw new HttpError(
      401,
      "USUARIO_INVALIDO",
      "El usuario no existe o está inactivo"
    );
  }

  if (usuario.rol !== "estudiante") {
    throw new HttpError(
      403,
      "ACCESO_DENEGADO",
      "Solo los estudiantes pueden gestionar matrículas"
    );
  }
}

export async function crearMatricula(
  usuarioId: number,
  cursoId: number
) {
  await validarEstudiante(usuarioId);

  const curso = listarCursos().find((item) => item.id === cursoId);

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