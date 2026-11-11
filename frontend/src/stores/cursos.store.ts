import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { listarCursos, type Curso } from '@/api/cursos.api'

export const useCursosStore = defineStore('courses', () => {
  const porId = ref<Record<number,Curso>>({})
  const cursos = computed(() => Object.values(porId.value).sort((a,b) => a.id-b.id))
  const cargando = ref(false)
  const cargado = ref(false)
  const error = ref<string | null>(null)
  let actualizado = 0
  let generacion = 0
  let consulta: Promise<void> | null = null
  function limpiar() {
    generacion++
    porId.value = {}
    actualizado = 0
    cargado.value = false
    error.value = null
    consulta = null
  }
  function cargarCursos(forzar = true): Promise<void> {
    if (consulta) return consulta
    if (!forzar && Date.now()-actualizado<10000) return Promise.resolve()
    const version = generacion
    cargando.value = true
    error.value = null
    consulta = listarCursos().then(filas => {
      if (version !== generacion) return
      porId.value = Object.fromEntries(filas.map(c => [c.id,c]))
      actualizado = Date.now()
      cargado.value = true
    }).catch(() => {
      if (version === generacion) error.value = 'No fue posible consultar los cursos. Intenta nuevamente.'
    }).finally(() => {
      if (version === generacion) { cargando.value = false; consulta = null }
    })
    return consulta
  }
  return { cursos,cargando,cargado,error,cargarCursos,limpiar }
})
