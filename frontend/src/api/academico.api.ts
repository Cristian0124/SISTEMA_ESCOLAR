import api from './axios'

export interface Facultad { codigo: string; nombre: string }
export interface Carrera {
  codigo: string
  nombre: string
  facultadCodigo: string
  facultad: string
  nivel: string
  modalidad: string
  fuente: string
  consultadoEn: string
  prerrequisitosVerificados: boolean
  asignaturas: number
  creditos: number
}
export interface Asignatura { codigo: string; nombre: string; semestre: number; creditos: number }
export async function listarFacultades() {
  return (await api.get<Facultad[]>('/academico/facultades')).data
}
export async function listarCarreras() {
  return (await api.get<Carrera[]>('/academico/carreras')).data
}
export async function consultarPensum(codigo: string) {
  return (await api.get<Asignatura[]>(`/academico/carreras/${encodeURIComponent(codigo)}/pensum`)).data
}

export interface RevisionPensum {
  codigo: string
  nombre: string
  prerrequisitosVerificados: boolean
  asignaturas: (Asignatura & { prerrequisitos: string[] })[]
  version: string
}

export interface EdicionPensum {
  version: string
  asignaturas: { codigo: string; prerrequisitos: string[] }[]
  validar: boolean
  revisionConfirmada: boolean
}

export async function consultarPrerrequisitos(codigo: string): Promise<RevisionPensum> {
  return (await api.get<RevisionPensum>(`/academico/carreras/${encodeURIComponent(codigo)}/prerrequisitos`)).data
}

export async function guardarPrerrequisitos(codigo: string, revision: EdicionPensum): Promise<RevisionPensum> {
  return (await api.put<RevisionPensum>(`/academico/carreras/${encodeURIComponent(codigo)}/prerrequisitos`, revision)).data
}
