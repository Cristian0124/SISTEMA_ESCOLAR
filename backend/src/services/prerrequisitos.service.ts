import * as repositorio from '../repositorios/academico.repository';
import { esquemaRevisionPensum, type RevisionPensum } from '../schemas/academico.schema';
import { HttpError } from '../types/http-error';

function validarRelaciones(asignaturas: RevisionPensum['asignaturas']): void {
  const relaciones = new Map(asignaturas.map(asignatura => [asignatura.codigo, asignatura.prerrequisitos]));
  if (relaciones.size !== asignaturas.length) {
    throw new HttpError(400, 'ASIGNATURA_REPETIDA', 'Cada asignatura debe aparecer una sola vez.');
  }
  for (const asignatura of asignaturas) {
    if (new Set(asignatura.prerrequisitos).size !== asignatura.prerrequisitos.length) {
      throw new HttpError(400, 'PRERREQUISITO_REPETIDO', `Revisa los prerrequisitos repetidos de ${asignatura.codigo}.`);
    }
    for (const requisito of asignatura.prerrequisitos) {
      if (!relaciones.has(requisito)) {
        throw new HttpError(400, 'PRERREQUISITO_AJENO', `El prerrequisito ${requisito} debe pertenecer al mismo pénsum.`);
      }
      if (requisito === asignatura.codigo) {
        throw new HttpError(400, 'PRERREQUISITO_PROPIO', `La asignatura ${asignatura.codigo} no puede ser su propio prerrequisito.`);
      }
    }
  }

  const visitadas = new Set<string>();
  const enRecorrido = new Set<string>();
  function visitar(codigo: string): void {
    if (enRecorrido.has(codigo)) {
      throw new HttpError(400, 'CICLO_PRERREQUISITOS', `Hay un ciclo de prerrequisitos que incluye ${codigo}. Revisa las dependencias entre asignaturas.`);
    }
    if (visitadas.has(codigo)) return;
    enRecorrido.add(codigo);
    for (const requisito of relaciones.get(codigo) ?? []) visitar(requisito);
    enRecorrido.delete(codigo);
    visitadas.add(codigo);
  }
  for (const codigo of relaciones.keys()) visitar(codigo);
}

export async function consultarRevision(codigo: string) {
  const revision = await repositorio.consultarRevisionPensum(codigo);
  if (!revision) throw new HttpError(404, 'CARRERA_NO_ENCONTRADA', 'Carrera no encontrada.');
  return revision;
}

export async function guardarRevision(codigo: string, entrada: unknown) {
  const datos = esquemaRevisionPensum.safeParse(entrada);
  if (!datos.success) {
    throw new HttpError(400, 'REVISION_INVALIDA', datos.error.issues[0]?.message ?? 'Revisa los datos del pénsum.');
  }
  validarRelaciones(datos.data.asignaturas);
  return repositorio.guardarRevisionPensum(codigo, datos.data);
}
