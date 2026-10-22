import api from '@/api/axios'

export interface CalificacionMateriaMatriculada {
  matriculaId: number
  cursoCodigo: string
  codigoMateria: string
  nombreMateria: string
  semestre: number
  horario: string
  corte1: number | null
  corte2: number | null
  corte3: number | null
  nota: number | null
}

export async function listarMisCalificaciones(): Promise<CalificacionMateriaMatriculada[]> {
  const { data } = await api.get<CalificacionMateriaMatriculada[]>('/matriculas/calificaciones/mias')
  return data
}
