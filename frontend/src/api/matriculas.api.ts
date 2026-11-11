import api from './axios'
import type { Curso } from './cursos.api'

export interface Matricula {
  id: number
  usuarioId?: number
  nombreEstudiante?: string
  correoEstudiante?: string
  curso: Curso
  estado?: string
  fecha?: string
  periodo?: string
}

async function consultarMatriculas(endpoint: string): Promise<Matricula[]> {
  const { data } = await api.get<Matricula[]>(endpoint)
  if (!Array.isArray(data) || !data.every((matricula) =>
    matricula && typeof matricula.id === 'number' && matricula.curso
    && typeof matricula.curso.nombre === 'string' && typeof matricula.curso.horario === 'string',
  )) throw new Error('La respuesta de matrículas no tiene un formato válido.')
  return data
}

export function listarMisMatriculas() {
  return consultarMatriculas('/matriculas/mias')
}

export function listarTodasLasMatriculas() {
  return consultarMatriculas('/matriculas/admin/todas')
}

export interface SolicitudMatricula {
  id: string
  curso_id: number
  curso_codigo: string
  materia: string
  estado: 'en_espera' | 'procesando' | 'confirmada' | 'rechazada'
  motivo: string | null
  matricula_id: number | null
  creada_en: string
}
export async function crearMatricula(cursoId: number, clave: string = crypto.randomUUID()) {
  return (await api.post<Pick<SolicitudMatricula,'id' | 'estado' | 'curso_id' | 'motivo' | 'matricula_id'>>(
    '/matriculas', { cursoId }, { headers: { 'Idempotency-Key':clave } }
  )).data
}
export async function listarSolicitudes() {
  return (await api.get<SolicitudMatricula[]>('/matriculas/solicitudes')).data
}
