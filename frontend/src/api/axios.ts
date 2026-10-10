import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'
import type { LoginResponse } from '@/types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // envía la cookie del refresh token
  timeout: 10000
})

interface ConfigReintento extends InternalAxiosRequestConfig {
  _reintentado?: boolean
}

// Si varias peticiones fallan con 401 a la vez, se renueva una sola vez
let renovando: Promise<LoginResponse> | null = null

api.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (respuesta) => respuesta,
  async (error: AxiosError) => {
    const original = error.config as ConfigReintento | undefined
    const esRutaAuth = original?.url?.startsWith('/auth/')

    if (error.response?.status !== 401 || !original || original._reintentado || esRutaAuth) {
      return Promise.reject(error)
    }

    original._reintentado = true
    const auth = useAuthStore()

    try {
      renovando ??= api
        .post<LoginResponse>('/auth/refresh')
        .then((r) => r.data)
        .finally(() => {
          renovando = null
        })
      const datos = await renovando
      auth.accessToken = datos.accessToken
      return api(original) // reintenta la petición original
    } catch {
      auth.limpiarSesion()
      window.location.assign('/login')
      return Promise.reject(error)
    }
  }
)

export default api
