import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as authService from '@/services/authService'
import type { LoginRequest, Usuario } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  // El access token vive solo en memoria (no en localStorage)
  const accessToken = ref<string | null>(null)
  const usuario = ref<Usuario | null>(null)
  const cargando = ref(false)
  const error = ref<string | null>(null)

  const autenticado = computed(() => accessToken.value !== null)

  async function iniciarSesion(datos: LoginRequest): Promise<boolean> {
    cargando.value = true
    error.value = null
    try {
      const { data } = await authService.login(datos)
      accessToken.value = data.accessToken
      usuario.value = data.usuario
      return true
    } catch {
      error.value = 'Credenciales inválidas o servidor no disponible'
      return false
    } finally {
      cargando.value = false
    }
  }

  // Al recargar la página el token en memoria se pierde: se recupera con la cookie
  async function restaurarSesion() {
    try {
      const { data } = await authService.refresh()
      accessToken.value = data.accessToken
      usuario.value = data.usuario
    } catch {
      limpiarSesion()
    }
  }

  async function cerrarSesion() {
    try {
      await authService.logout()
    } finally {
      limpiarSesion()
    }
  }

  function limpiarSesion() {
    accessToken.value = null
    usuario.value = null
  }

  return {
    accessToken,
    usuario,
    cargando,
    error,
    autenticado,
    iniciarSesion,
    restaurarSesion,
    cerrarSesion,
    limpiarSesion
  }
})
