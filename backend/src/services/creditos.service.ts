import { HttpError } from '../types/http-error';
import { buscarUsuarioPorId } from '../repositorios/auth.repository';
import { validarEstudiante } from './estudiantes.service';
import * as creditosRepositorio from '../repositorios/creditos.repository';

export async function obtenerMisCreditos(usuarioId: number) {
  await validarEstudiante(usuarioId);
  const [resumen, solicitud] = await Promise.all([
    creditosRepositorio.obtenerResumenCreditos(usuarioId),
    creditosRepositorio.obtenerUltimaSolicitudCreditos(usuarioId)
  ]);
  return { ...resumen, solicitud };
}

export async function solicitarCreditosAdicionales(usuarioId: number, creditos: number, motivo: string) {
  await validarEstudiante(usuarioId);
  const { creditosPrograma } = await creditosRepositorio.obtenerResumenCreditos(usuarioId);
  if (!Number.isSafeInteger(creditos) || creditos < 1 || creditos > creditosPrograma) {
    throw new HttpError(400, "CREDITOS_INVALIDOS", `Solicita una cantidad entera de créditos entre 1 y ${creditosPrograma}`);
  }
  const motivoNormalizado = motivo.trim();
  if (motivoNormalizado.length < 10 || motivoNormalizado.length > 1000) {
    throw new HttpError(400, "MOTIVO_INVALIDO", "Explica el motivo en un texto de 10 a 1000 caracteres");
  }
  if (await creditosRepositorio.tieneSolicitudPendiente(usuarioId)) {
    throw new HttpError(409, "SOLICITUD_PENDIENTE", "Ya tienes una solicitud de créditos pendiente de revisión");
  }
  try {
    await creditosRepositorio.crearSolicitudCreditos(usuarioId, creditos, motivoNormalizado);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw new HttpError(409, "SOLICITUD_PENDIENTE", "Ya tienes una solicitud de créditos pendiente de revisión");
    }
    throw error;
  }
}

export async function listarSolicitudesCreditosAdministrador(administradorId: number) {
  const administrador = await buscarUsuarioPorId(administradorId);
  if (!administrador || !administrador.activo || administrador.rol !== "admin") {
    throw new HttpError(403, "ACCESO_DENEGADO", "Solo los administradores pueden revisar solicitudes de créditos");
  }
  return creditosRepositorio.listarSolicitudesCreditos();
}

export async function revisarSolicitudCreditosAdministrador(
  administradorId: number,
  solicitudId: number,
  decision: "Aprobada" | "Rechazada"
) {
  const administrador = await buscarUsuarioPorId(administradorId);
  if (!administrador || !administrador.activo || administrador.rol !== "admin") {
    throw new HttpError(403, "ACCESO_DENEGADO", "Solo los administradores pueden revisar solicitudes de créditos");
  }
  if (!(await creditosRepositorio.revisarSolicitudCreditos(solicitudId, decision, administradorId))) {
    throw new HttpError(409, "SOLICITUD_NO_PENDIENTE", "La solicitud no existe o ya fue revisada");
  }
}
