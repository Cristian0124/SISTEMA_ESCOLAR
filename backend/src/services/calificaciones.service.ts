import { HttpError } from '../types/http-error';
import { buscarUsuarioPorId } from '../repositorios/auth.repository';
import { listarCursos } from '../repositorios/cursos.repository';
import { guardarCalificacion, listarAvanceEstudiante, listarCalificacionesMateriasMatriculadas, listarCodigosAprobados, materiaExiste, type CortesCalificacion } from '../repositorios/calificaciones.repository';
import * as repositorio from '../repositorios/matriculas.repository';
import { validarEstudiante } from './estudiantes.service';

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
  if (!(await materiaExiste(codigoMateria, usuarioId))) {
    throw new HttpError(404, "MATERIA_NO_ENCONTRADA", "No se encontró la materia del pensum");
  }
  if (registrador.rol === "profesor") {
    const cursos = await listarCursos();
    const grupos = cursos.filter((item) =>
      item.codigoPensum === codigoMateria && item.docenteId === registrador.id,
    );
    if (!grupos.length) {
      throw new HttpError(403, "CURSO_NO_ASIGNADO", "No tienes asignada esta materia");
    }
    const matriculas = await Promise.all(grupos.map(curso => repositorio.estaMatriculadoEnCurso(usuarioId, curso.id)));
    if (!matriculas.some(Boolean)) {
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
