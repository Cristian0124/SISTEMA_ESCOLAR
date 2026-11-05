import { ref } from 'vue'
import { defineStore } from 'pinia'
import { listarCursos, type Curso } from '@/api/cursos.api'

export const useCursosStore = defineStore('courses', () => {
  const cursos = ref<Curso[]>([])
  const cargando = ref(false)
  const cargado = ref(false)
  const error = ref<string | null>(null)

  async function cargarCursos() {
    cargando.value = true
    error.value = null
    try {
      cursos.value = await listarCursos()
    } catch {
      error.value = 'No fue posible consultar los cursos. Intenta nuevamente.'
    } finally {
      cargando.value = false
      cargado.value = true
    }
  }

  return { cursos, cargando, cargado, error, cargarCursos }
})
