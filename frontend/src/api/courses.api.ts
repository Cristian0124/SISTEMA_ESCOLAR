import api from '@/api/axios'

export interface Curso {
  id: number
  codigo: string
  nombre: string
  docente: string | null
  docenteId: number | null
  horario: string
  cuposTotales: number
  cuposDisponibles: number
  codigoPensum: string
  semestre?: number
  creditos?: number
  carreraCodigo?: string | null
  carreraNombre?: string | null
  facultadCodigo?: string | null
  facultadNombre?: string | null
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

export interface NuevoCurso {
  codigoPensum: string
  profesorId: number
  horario: string
  cuposTotales: number
}

export async function crearCurso(datos: NuevoCurso): Promise<Curso> {
  const { data } = await api.post<Curso>('/cursos', datos)
  return data
}
