import api from '@/api/axios'

export type EstadoSolicitudCreditos = 'Pendiente' | 'Aprobada' | 'Rechazada'

export interface ResumenCreditos {
  creditosPrograma: number
  semestre: number
  creditosBase: number
  creditosMatriculados: number
  creditosExtra: number
  creditosDisponibles: number
  periodo: string
  solicitud: {
    id: number
    periodo: string
    creditos: number
    motivo: string
    estado: EstadoSolicitudCreditos
    solicitadoEn: string
    revisadoEn: string | null
  } | null
}

export interface SolicitudCreditos {
  id: number
  usuarioId: number
  nombreEstudiante: string
  cedula: string
  periodo: string
  creditos: number
  motivo: string
  estado: EstadoSolicitudCreditos
  solicitadoEn: string
  revisadoEn: string | null
}

export async function obtenerMisCreditos(): Promise<ResumenCreditos> {
  const { data } = await api.get<ResumenCreditos>('/creditos/mios')
  return data
}

export async function solicitarCreditos(creditos: number, motivo: string): Promise<void> {
  await api.post('/creditos/solicitudes', { creditos, motivo })
}

export async function listarSolicitudesCreditos(): Promise<SolicitudCreditos[]> {
  const { data } = await api.get<SolicitudCreditos[]>('/creditos/solicitudes')
  return data
}

export async function revisarSolicitudCreditos(id: number, decision: 'Aprobada' | 'Rechazada'): Promise<void> {
  await api.patch(`/creditos/solicitudes/${id}`, { decision })
}
