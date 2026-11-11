import { useAutenticacionStore } from "./autenticacion.store"
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { crearMatricula, listarSolicitudes, type SolicitudMatricula } from '@/api/matriculas.api'

export const useMatriculasStore = defineStore('matriculas', () => {
  const porId = ref<Record<string,SolicitudMatricula>>({})
  const solicitudes = computed(() => Object.values(porId.value).sort((a,b) => b.creada_en.localeCompare(a.creada_en)))
  const cargando = ref(false)
  const error = ref('')
  let consultando = false

  async function cargar() {
    if (consultando) return
    const propietario = useAutenticacionStore().usuario?.id
    consultando = true
    cargando.value = true
    try {
      const filas = await listarSolicitudes()
      if (useAutenticacionStore().usuario?.id !== propietario) return
      porId.value = Object.fromEntries(filas.map(s => [s.id,s]))
      error.value = ''
    } catch {
      error.value = 'No se pudo actualizar el estado. Tus solicitudes se conservan en el servidor.'
    } finally {
      cargando.value = false
      consultando = false
    }
  }
  async function solicitar(cursoId: number, usuarioId: number) {
    // Conserva la clave en esta pestaña si se pierde la respuesta al envío.
    const nombre = `sis-v2:solicitud:${usuarioId}:${cursoId}`
    const clave = sessionStorage.getItem(nombre) ?? crypto.randomUUID()
    sessionStorage.setItem(nombre,clave)
    const solicitud = await crearMatricula(cursoId,clave)
    sessionStorage.removeItem(nombre)
    await cargar()
    return solicitud
  }
  function limpiar() { porId.value = {}; error.value = '' }
  return { solicitudes,cargando,error,cargar,solicitar,limpiar }
})
