import api from '@/api/axios'
import type { Curso } from '@/api/courses.api'

export interface EstudianteDeCurso {
  id: number
  nombre: string
  cedula: string
  nota: number | null
  corte1: number | null
  corte2: number | null
  corte3: number | null
}

export async function listarCursosAsignados(): Promise<Curso[]> {
  const { data } = await api.get<Curso[]>('/matriculas/docente/cursos')
  return data
}

export async function listarEstudiantesDelCurso(cursoId: number): Promise<EstudianteDeCurso[]> {
  const { data } = await api.get<EstudianteDeCurso[]>(`/matriculas/docente/cursos/${cursoId}/estudiantes`)
  return data
}

export async function registrarNota(estudianteId: number, codigoMateria: string, cortes: { corte1: number; corte2: number; corte3: number }): Promise<{ nota: number }> {
  const { data } = await api.put<{ nota: number }>(`/matriculas/calificaciones/${estudianteId}/${codigoMateria}`, cortes)
  return data
}
