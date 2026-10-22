import api from '@/api/axios'

export interface Curso {
  id: number
  codigo: string
  nombre: string
  docente: string
  horario: string
  cuposTotales: number
  cuposDisponibles: number
  codigoPensum: string
  semestre?: number
  creditos?: number
}

export interface ProfesorDisponible {
  id: number
  nombre: string
  correo: string
}

export async function listarCursos(): Promise<Curso[]> {
  const { data } = await api.get<Curso[]>('/cursos')
  return data
}

export async function listarProfesores(): Promise<ProfesorDisponible[]> {
  const { data } = await api.get<ProfesorDisponible[]>('/auth/profesores')
  return data
}

export async function asignarProfesor(cursoId: number, profesorId: number): Promise<void> {
  await api.put(`/cursos/${cursoId}/docente`, { profesorId })
}
