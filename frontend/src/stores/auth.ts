import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as authService from '@/services/authService'
import { isAxiosError } from 'axios'
import type { LoginRequest, LoginResponse, Usuario } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  // El access token vive solo en memoria (no en localStorage)
  const accessToken = ref<string | null>(null)
  const usuario = ref<Usuario | null>(null)
  const cargando = ref(false)
  const error = ref<string | null>(null)
  const sesionRestaurada = ref(false)
  let restauracionEnCurso: Promise<void> | null = null

  const autenticado = computed(() => accessToken.value !== null)

  async function iniciarSesion(datos: LoginRequest): Promise<boolean> {
    cargando.value = true
    error.value = null
    try {
      const { data } = await authService.login(datos)
      establecerSesion(data)
      return true
    } catch (fallo) {
      if (isAxiosError(fallo)) {
        const estado = fallo.response?.status
        error.value = !fallo.response ? 'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.'
          : estado === 401 ? 'Correo o contraseña incorrectos.'
          : estado === 503 ? 'El servicio no está disponible temporalmente. Intenta nuevamente más tarde.'
          : estado && estado >= 500 ? 'Ocurrió un error en el servidor. Intenta nuevamente o contacta a soporte.'
          : 'No fue posible iniciar sesión. Revisa los datos e intenta nuevamente.'
      } else error.value = 'No fue posible iniciar sesión. Intenta nuevamente.'
      return false
    } finally {
      cargando.value = false
    }
  }

  // Al recargar la página el token en memoria se pierde: se recupera con la cookie
  function establecerSesion(sesion: LoginResponse) {
    accessToken.value = sesion.accessToken
    usuario.value = sesion.usuario
    sesionRestaurada.value = true
  }

  async function restaurarSesion(): Promise<void> {
    if (sesionRestaurada.value) return
    if (restauracionEnCurso) return restauracionEnCurso

    restauracionEnCurso = authService.refresh()
      .then(({ data }) => establecerSesion(data))
      .catch(() => limpiarSesion())
      .finally(() => {
        restauracionEnCurso = null
      })

    return restauracionEnCurso
  }

  async function cerrarSesion() {
    void authService.logout().catch(() => undefined)
    limpiarSesion()
  }

  function limpiarSesion() {
    accessToken.value = null
    usuario.value = null
    sesionRestaurada.value = true
  }

  return {
    accessToken,
    usuario,
    cargando,
    error,
    autenticado,
    sesionRestaurada,
    establecerSesion,
    iniciarSesion,
    restaurarSesion,
    cerrarSesion,
    limpiarSesion
  }
})
