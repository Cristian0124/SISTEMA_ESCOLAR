import api from '@/api/axios'

export interface MateriaAvance {
  codigo: string
  nombre: string
  semestre: number
  creditos: number
  prerrequisitos: string[]
  aprobada: boolean
  bloqueada: boolean
  requisitosPendientes: string[]
}

export async function consultarAvancePensum(): Promise<MateriaAvance[]> {
  const { data } = await api.get<MateriaAvance[]>('/matriculas/avance')
  return data
}
