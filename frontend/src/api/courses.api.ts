import api from '@/api/axios'

export interface Curso {
  id: number
  codigo: string
  nombre: string
  docente: string
  horario: string
  cuposTotales: number
  cuposDisponibles: number
  semestre?: number
  creditos?: number
}

export async function listarCursos(): Promise<Curso[]> {
  const { data } = await api.get<Curso[]>('/cursos')
  return data
}
