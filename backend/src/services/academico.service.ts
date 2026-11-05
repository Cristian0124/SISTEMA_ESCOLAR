import * as repositorio from '../repositorios/academico.repository';
import { esquemaAsignacionCarrera } from '../schemas/academico.schema';
import { HttpError } from '../types/http-error';

export { listarFacultades, listarCarreras, listarEstudiantesSinCarrera } from '../repositorios/academico.repository';

export async function consultarPensum(codigo: string) {
  if (!await repositorio.existeCarrera(codigo)) throw new HttpError(404, 'CARRERA_NO_ENCONTRADA', 'Carrera no encontrada');
  return repositorio.consultarPensum(codigo);
}

export async function asignarCarreraInicial(id: number, entrada: unknown) {
  const datos = esquemaAsignacionCarrera.safeParse(entrada);
  if (!Number.isSafeInteger(id) || id < 1 || !datos.success) {
    throw new HttpError(400, 'DATOS_INVALIDOS', 'Selecciona un estudiante y una carrera válidos');
  }
  if (!await repositorio.existeCarrera(datos.data.carreraCodigo)) {
    throw new HttpError(400, 'CARRERA_INVALIDA', 'Carrera no válida');
  }
  const resultado = await repositorio.asignarCarreraInicial(id, datos.data.carreraCodigo);
  if (!resultado) throw new HttpError(409, 'CARRERA_YA_ASIGNADA', 'El estudiante no existe o ya tiene carrera asignada');
  return resultado;
}
