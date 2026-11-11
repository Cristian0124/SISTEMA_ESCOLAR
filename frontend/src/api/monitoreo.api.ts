import api from './axios'

export interface PeriodoMatricula {
  codigo: string
  apertura: string
  cierre: string
  habilitado: boolean
  abierto: boolean
}
export interface MetricasMatricula {
  pendientes: number
  procesando: number
  confirmadas: number
  rechazadas: number
  reservas: number
  workers: number
  latenciaP95Ms: number | null
  actualizadoEn: string
  proceso: {
    pid: number
    solicitudesHttp: number
    erroresHttp: number
    promedioHttpMs: number
    memoriaMb: number
    activoSegundos: number
    conexionesBD: number
    conexionesLibresBD: number
    conexionesEnEsperaBD: number
  }
}
export async function consultarPeriodo() {
  return (await api.get<PeriodoMatricula | null>('/masiva/periodo')).data
}
export async function guardarPeriodo(datos: Pick<PeriodoMatricula,'apertura' | 'cierre' | 'habilitado'>) {
  return (await api.put<PeriodoMatricula>('/masiva/periodo', datos)).data
}
export async function consultarMetricas() {
  return (await api.get<MetricasMatricula>('/masiva/monitoreo')).data
}
