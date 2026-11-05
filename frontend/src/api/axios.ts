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
    const codigo = (error.response?.data as { codigo?: string } | undefined)?.codigo
    const sesionConRolDesactualizado = error.response?.status === 403 && codigo === 'ROL_MODIFICADO'

    if ((error.response?.status !== 401 && !sesionConRolDesactualizado)
      || !original || original._reintentado || esRutaAuth) {
      return Promise.reject(error)
    }

    original._reintentado = true
    const auth = useAuthStore()
    const rolAnterior = auth.usuario?.rol
    let datos: LoginResponse

    try {
      renovando ??= api
        .post<LoginResponse>('/auth/refresh')
        .then((r) => r.data)
        .finally(() => {
          renovando = null
        })
      datos = await renovando
    } catch {
      auth.limpiarSesion()
      window.location.assign('/login')
      return Promise.reject(error)
    }

    auth.establecerSesion(datos)
    if (rolAnterior && rolAnterior !== datos.usuario.rol) {
      const inicio = datos.usuario.rol === 'admin' ? '/admin/home'
        : datos.usuario.rol === 'profesor' ? '/profesor/home' : '/home'
      window.location.replace(inicio)
      return Promise.reject(error)
    }

    return api(original)
  }
)
export default api
