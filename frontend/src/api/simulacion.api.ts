import api from './axios'

export interface ProgresoSimulacion {
  fase: 'preparando' | 'ejecutando' | 'verificando'
  estudiantes: number
  cupos: number
  enviadas: number
  recibidas: number
  pendientes: number
  procesando: number
  confirmadas: number
  rechazadas: number
  reservas: number
  matriculas: number
  transcurridoMs: number
}
export interface ResultadoSimulacion {
  estudiantes: number
  cupos: number
  conexionesMaximas: number
  matriculas: number
  duplicadas: number
  idempotente: boolean
  correcto: boolean
  totalMs: number
  envioMs: number
  solicitudesPorSegundo: number
  pausaDemostracionMs: number
  latenciaHttpMs: { p50: number; p95: number; p99: number }
  motivosRechazo: { codigo_error: string | null; cantidad: number }[]
  errores: Record<string,number>
  erroresTransporte: Record<string,number>
}
export interface EstadoSimulacion {
  id: string | null
  estado: 'sin_iniciar' | 'preparando' | 'ejecutando' | 'verificando' | 'completada' | 'fallida'
  estudiantes: number
  cupos: number
  modoExposicion: boolean
  progreso: ProgresoSimulacion | null
  resultado: ResultadoSimulacion | null
  mensaje: string
}
export async function consultarSimulacion() {
  return (await api.get<EstadoSimulacion>('/masiva/simulacion')).data
}
export async function iniciarSimulacion(datos: { estudiantes:number; cupos:number; modoExposicion:boolean }) {
  return (await api.post<EstadoSimulacion>('/masiva/simulacion',datos)).data
}
