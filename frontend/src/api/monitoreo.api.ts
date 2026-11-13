import api from './axios'

export interface PeriodoMatricula {
  codigo: string
  apertura: string
  cierre: string
  habilitado: boolean
  abierto: boolean
}
export interface MetricasMatricula {
  pruebasCarga: PruebaCargaTelemetria[]
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

export interface PruebaCargaTelemetria {
  id: string
  estado: 'preparando' | 'ejecutando' | 'verificando' | 'completada' | 'fallida'
  estudiantes: number
  cupos: number
  conexiones: number
  pausaMs: number
  pid: number
  progreso: Partial<{
    pendientes:number; procesando:number; confirmadas:number; rechazadas:number
    reservas:number; matriculas:number; recibidas:number; enviadas:number; transcurridoMs:number
  }>
  proceso: MetricasMatricula['proceso'] | null
  resultado: {
    correcto:boolean
    totalMs:number
    duplicadas:number
    idempotente:boolean
    estados:{estado:string;cantidad:number}[]
    latenciaHttpMs:{p50:number;p95:number;p99:number}
    errores:Record<string,number>
    erroresTransporte:Record<string,number>
  } | null
  mensaje: string | null
  iniciadaEn: string
  actualizadaEn: string
  terminadaEn: string | null
  sinActualizacion: boolean
}
