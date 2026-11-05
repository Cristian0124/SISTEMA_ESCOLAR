import { HttpError } from '../types/http-error';
import { buscarUsuarioPorId } from '../repositorios/auth.repository';

export async function validarEstudiante(usuarioId: number): Promise<void> {
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
