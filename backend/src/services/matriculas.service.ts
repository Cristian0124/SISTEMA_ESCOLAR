import { HttpError } from "../types/http-error";
import { buscarUsuarioPorId } from "../repositorios/auth.repository";
import { buscarCursoPorId, listarCursos } from "../repositorios/cursos.repository";
import {
  guardarCalificacion,
  listarAvanceEstudiante,
  listarCalificacionesMateriasMatriculadas,
  listarCodigosAprobados,
  materiaExiste,
  type CortesCalificacion
} from "../repositorios/calificaciones.repository";
import * as repositorio from "../repositorios/matriculas.repository";

function normalizarNombre(nombre: string): string {
  return nombre.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLocaleLowerCase();
}

async function obtenerCursoAsignado(profesorId: number, cursoId: number) {
  const profesor = await buscarUsuarioPorId(profesorId);
  if (!profesor || !profesor.activo || profesor.rol !== "profesor") {
    throw new HttpError(403, "ACCESO_DENEGADO", "Solo los profesores pueden consultar sus cursos asignados");
  }

  const curso = await buscarCursoPorId(cursoId);
  if (!curso || normalizarNombre(curso.docente) !== normalizarNombre(profesor.nombre)) {
    throw new HttpError(403, "CURSO_NO_ASIGNADO", "No tienes asignado este curso");
  }
  return curso;
}

export async function listarCursosAsignadosProfesor(profesorId: number) {
  const profesor = await buscarUsuarioPorId(profesorId);
  if (!profesor || !profesor.activo || profesor.rol !== "profesor") {
    throw new HttpError(403, "ACCESO_DENEGADO", "Solo los profesores pueden consultar sus cursos asignados");
  }

  return (await listarCursos()).filter((curso) => normalizarNombre(curso.docente) === normalizarNombre(profesor.nombre));
}

export async function listarEstudiantesDeCursoProfesor(profesorId: number, cursoId: number) {
  const curso = await obtenerCursoAsignado(profesorId, cursoId);
  return repositorio.listarEstudiantesPorCurso(curso.id, curso.codigoPensum);
}

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

export async function obtenerAvancePensum(usuarioId: number) {
  await validarEstudiante(usuarioId);
  const [materias, codigosAprobados] = await Promise.all([
    listarAvanceEstudiante(usuarioId),
    listarCodigosAprobados(usuarioId)
  ]);
  const aprobadas = new Set(codigosAprobados);

  return materias.map((materia) => {
    const requisitosPendientes = materia.prerrequisitos.filter((codigo) => !aprobadas.has(codigo));
    const aprobada = aprobadas.has(materia.codigo);

    return {
      ...materia,
      nota: undefined,
      aprobada,
      bloqueada: !aprobada && requisitosPendientes.length > 0,
      requisitosPendientes
    };
  });
}

export async function listarMisCalificaciones(usuarioId: number) {
  await validarEstudiante(usuarioId);
  return listarCalificacionesMateriasMatriculadas(usuarioId);
}

export async function registrarCalificacion(
  registradaPor: number,
  usuarioId: number,
  codigoMateria: string,
  cortes: CortesCalificacion
): Promise<{ nota: number }> {
  const registrador = await buscarUsuarioPorId(registradaPor);
  if (!registrador || !registrador.activo || (registrador.rol !== "admin" && registrador.rol !== "profesor")) {
    throw new HttpError(403, "ACCESO_DENEGADO", "No tienes permisos para registrar calificaciones");
  }

  const usuario = await buscarUsuarioPorId(usuarioId);
  if (!usuario || usuario.rol !== "estudiante") {
    throw new HttpError(404, "ESTUDIANTE_NO_ENCONTRADO", "No se encontró el estudiante");
  }
  if (!(await materiaExiste(codigoMateria))) {
    throw new HttpError(404, "MATERIA_NO_ENCONTRADA", "No se encontró la materia del pensum");
  }
  if (registrador.rol === "profesor") {
    const cursos = await listarCursos();
    const curso = cursos.find((item) =>
      item.codigoPensum === codigoMateria && normalizarNombre(item.docente) === normalizarNombre(registrador.nombre),
    );
    if (!curso) {
      throw new HttpError(403, "CURSO_NO_ASIGNADO", "No tienes asignada esta materia");
    }
    if (!(await repositorio.estaMatriculadoEnCurso(usuarioId, curso.id))) {
      throw new HttpError(409, "ESTUDIANTE_NO_MATRICULADO", "El estudiante no está matriculado en tu curso");
    }
  }
  const valoresCortes = [cortes.corte1, cortes.corte2, cortes.corte3];
  if (valoresCortes.some((valor) =>
    !Number.isFinite(valor) || valor < 0 || valor > 5 || Math.round(valor * 10) !== valor * 10
  )) {
    throw new HttpError(400, "CORTES_INVALIDOS", "Cada corte debe estar entre 0.0 y 5.0 con un decimal como maximo");
  }

  const nota = Number((cortes.corte1 * 0.3 + cortes.corte2 * 0.3 + cortes.corte3 * 0.4).toFixed(2));

  await guardarCalificacion(usuarioId, codigoMateria, cortes, nota, registradaPor);
  return { nota };
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
