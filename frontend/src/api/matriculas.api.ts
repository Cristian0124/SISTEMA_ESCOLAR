import api from './axios'
import type { Curso } from './courses.api'

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

export async function crearMatricula(cursoId: number): Promise<void> {
  await api.post('/matriculas', { cursoId })
}
