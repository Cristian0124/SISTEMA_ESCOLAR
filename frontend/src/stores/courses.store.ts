import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { listarCursos, type Curso } from '@/api/courses.api'

export const useCoursesStore = defineStore('courses', () => {
  const cursos = ref<Curso[]>([])
  const cargando = ref(false)
  const error = ref<string | null>(null)
  const hayCursos = computed(() => cursos.value.length > 0)

  async function cargarCursos() {
    cargando.value = true
    error.value = null
    try {
      cursos.value = await listarCursos()
    } catch {
      error.value = 'No fue posible consultar los cursos. Intenta nuevamente.'
    } finally {
      cargando.value = false
    }
  }

  return { cursos, cargando, error, hayCursos, cargarCursos }
})
