import api from '@/api/axios'
import type { Curso } from '@/api/courses.api'

export interface EstudianteDeCurso {
  id: number
  nombre: string
  cedula: string
  nota: number | null
}

export async function listarCursosAsignados(): Promise<Curso[]> {
  const { data } = await api.get<Curso[]>('/matriculas/docente/cursos')
  return data
}

export async function listarEstudiantesDelCurso(cursoId: number): Promise<EstudianteDeCurso[]> {
  const { data } = await api.get<EstudianteDeCurso[]>(`/matriculas/docente/cursos/${cursoId}/estudiantes`)
  return data
}

export async function registrarNota(estudianteId: number, codigoMateria: string, nota: number): Promise<void> {
  await api.put(`/matriculas/calificaciones/${estudianteId}/${codigoMateria}`, { nota })
}