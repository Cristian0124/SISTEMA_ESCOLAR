import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import api from '@/api/axios'
import { crearMatricula, listarMisMatriculas } from '@/api/matriculas.api'
import { useAuthStore } from '@/stores/auth'

const adaptadorOriginal = api.defaults.adapter
const usuario = { id: 1, nombre: 'Estudiante', rol: 'estudiante' as const }

beforeEach(() => {
  setActivePinia(createPinia())
  useAuthStore().establecerSesion({ accessToken: 'vencido', usuario })
})

afterEach(() => { api.defaults.adapter = adaptadorOriginal })

it('renueva una sola vez y reintenta consultas y matrículas concurrentes con el nuevo token', async () => {
  const adaptador = vi.fn(async (config: InternalAxiosRequestConfig) => {
    const respuesta = { config, status: 200, statusText: 'OK', headers: {}, data: {} as unknown }
    if (config.url === '/auth/refresh') {
      return { ...respuesta, data: { accessToken: 'vigente', usuario } }
    }
    if (config.headers.Authorization === 'Bearer vencido') {
      throw new AxiosError('Token vencido', 'ERR_BAD_REQUEST', config, undefined, { ...respuesta, status: 401 })
    }
    expect(config.headers.Authorization).toBe('Bearer vigente')
    return { ...respuesta, data: config.method === 'get' ? [] : { id: 1 } }
  })
  api.defaults.adapter = adaptador

  const [matriculas] = await Promise.all([listarMisMatriculas(), crearMatricula(5)])

  expect(matriculas).toEqual([])
  expect(adaptador.mock.calls.filter(([config]) => config.url === '/auth/refresh')).toHaveLength(1)
  expect(adaptador.mock.calls.filter(([config]) => config.url === '/matriculas')).toHaveLength(2)
  expect(adaptador.mock.calls.filter(([config]) => config.url === '/matriculas/mias')).toHaveLength(2)
  expect(useAuthStore().accessToken).toBe('vigente')
})

it('rechaza una consulta de matrículas con formato inválido', async () => {
  api.defaults.adapter = async config => ({ config, status: 200, statusText: 'OK', headers: {}, data: [{ id: 1 }] })
  await expect(listarMisMatriculas()).rejects.toThrow('formato válido')
})
