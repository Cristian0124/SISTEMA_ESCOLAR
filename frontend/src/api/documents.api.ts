import api from '@/api/axios'

export interface ResumenMatricula {
  estudiante: { id: number; nombre: string; cedula: string; carrera: string | null }
  periodo: string
  cursos: { codigo: string; nombre: string; horario: string; creditos: number }[]
  totalCreditos: number
}

export async function consultarResumenMatricula() {
  const { data } = await api.get<ResumenMatricula>('/documentos/resumen-matricula')
  if (!data || !Array.isArray(data.cursos) || typeof data.periodo !== 'string'
    || typeof data.totalCreditos !== 'number') throw new Error('Respuesta de matrícula inválida')
  return data
}

export async function descargarResumenMatricula() {
  return (await api.get<Blob>('/documentos/resumen-matricula.pdf', { responseType: 'blob' })).data
}
