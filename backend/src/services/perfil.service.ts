import * as repositorio from '../repositorios/perfil.repository';
import { obtenerResumenCreditos } from '../repositorios/creditos.repository';
import { esquemaDatos } from '../schemas/perfil.schema';
import { HttpError } from '../types/http-error';

export async function consultarDatos(usuarioId: number) {
  const perfil = await repositorio.consultarDatosPersonales(usuarioId);
  if (!perfil) throw new HttpError(404, 'USUARIO_NO_ENCONTRADO', 'No se encontró el usuario');
  const { contacto, ...datos } = perfil;
  const { semestre } = await obtenerResumenCreditos(usuarioId);
  return { ciudad: '', direccion: '', telefono: '', celular: '', tipoSangre: '', ...contacto, ...datos, semestre: String(semestre) };
}

export async function guardarDatos(usuarioId: number, entrada: unknown) {
  const datos = esquemaDatos.safeParse(entrada);
  if (!datos.success) throw new HttpError(400, 'DATOS_INVALIDOS', 'Revisa los datos personales y el correo');
  try {
    await repositorio.guardarDatosPersonales(usuarioId, datos.data);
  } catch (error) {
    if ((error as { code?: string })?.code === '23505') {
      throw new HttpError(409, 'CORREO_EXISTENTE', 'Ese correo ya está registrado en otra cuenta');
    }
    throw error;
  }
  return datos.data;
}
