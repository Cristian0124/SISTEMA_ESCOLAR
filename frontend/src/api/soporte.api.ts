import api from '@/api/axios'

export interface SolicitudSoporte {
  id: number
  mensaje: string
  creadoEn: string
  respuesta: string | null
  respondidoEn: string | null
}

export interface SolicitudSoporteAdmin extends SolicitudSoporte {
  usuarioId: number
  nombreProfesor: string
  correoProfesor: string
}

export async function listarMisSolicitudesSoporte(): Promise<SolicitudSoporte[]> {
  const { data } = await api.get<SolicitudSoporte[]>('/soporte/mias')
  return data
}

export async function enviarSolicitudSoporte(mensaje: string): Promise<void> {
  await api.post('/soporte/mias', { mensaje })
}

export async function listarSolicitudesSoporte(): Promise<SolicitudSoporteAdmin[]> {
  const { data } = await api.get<SolicitudSoporteAdmin[]>('/soporte/admin')
  return data
}

export async function responderSolicitudSoporte(id: number, respuesta: string): Promise<void> {
  await api.patch(`/soporte/admin/${id}`, { respuesta })
}
