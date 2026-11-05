<script setup lang="ts">
import { computed } from 'vue'
import type { Curso } from '@/api/cursos.api'

export interface FiltrosCursos {
  busqueda: string
  semestre: string
  disponibilidad: 'todos' | 'disponibles' | 'sin-cupos'
}

const props = defineProps<{
  cursos: Curso[]
  modelValue: FiltrosCursos
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FiltrosCursos]
}>()

const semestres = computed(() => [...new Set(
  props.cursos
    .map((curso) => curso.semestre)
    .filter((semestre): semestre is number => typeof semestre === 'number'),
)].sort((a, b) => a - b))

function normalizar(valor: string): string {
  return valor.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase()
}

const cursosFiltrados = computed(() => {
  const termino = normalizar(props.modelValue.busqueda.trim())
  return props.cursos.filter((curso) => {
    const coincideBusqueda = !termino
      || [curso.nombre, curso.codigo, curso.docente]
        .some((campo) => normalizar(campo ?? '').includes(termino))
    const coincideSemestre = !props.modelValue.semestre
      || curso.semestre === Number(props.modelValue.semestre)
    const coincideDisponibilidad = props.modelValue.disponibilidad === 'todos'
      || (props.modelValue.disponibilidad === 'disponibles'
        ? curso.cuposDisponibles > 0
        : curso.cuposDisponibles <= 0)
    return coincideBusqueda && coincideSemestre && coincideDisponibilidad
  })
})

function actualizar<K extends keyof FiltrosCursos>(campo: K, valor: FiltrosCursos[K]): void {
  emit('update:modelValue', { ...props.modelValue, [campo]: valor })
}

function limpiarFiltros(): void {
  emit('update:modelValue', { busqueda: '', semestre: '', disponibilidad: 'todos' })
}
</script>

<template>
  <section class="course-filters" aria-label="Buscar y filtrar cursos">
    <div class="filter-controls">
      <label class="search-field">
        <span class="search-icon" aria-hidden="true">⌕</span>
        <span class="visually-hidden">Buscar por nombre, código o docente</span>
        <input
          :value="modelValue.busqueda"
          type="search"
          placeholder="Buscar por nombre del curso"
          @input="actualizar('busqueda', ($event.target as HTMLInputElement).value)"
        />
      </label>

      <label class="filter-field">
        <span>Semestre</span>
        <select
          :value="modelValue.semestre"
          aria-label="Filtrar por semestre"
          @change="actualizar('semestre', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">Todos</option>
          <option v-for="semestre in semestres" :key="semestre" :value="String(semestre)">
            Semestre {{ semestre }}
          </option>
        </select>
      </label>

      <label class="filter-field">
        <span>Disponibilidad</span>
        <select
          :value="modelValue.disponibilidad"
          aria-label="Filtrar por disponibilidad"
          @change="actualizar('disponibilidad', ($event.target as HTMLSelectElement).value as FiltrosCursos['disponibilidad'])"
        >
          <option value="todos">Todos los cursos</option>
          <option value="disponibles">Con cupos</option>
          <option value="sin-cupos">Sin cupos</option>
        </select>
      </label>

      <button
        v-if="modelValue.busqueda || modelValue.semestre || modelValue.disponibilidad !== 'todos'"
        class="clear-filters"
        type="button"
        @click="limpiarFiltros"
      >Limpiar filtros</button>
    </div>

    <p class="results-count" aria-live="polite">
      Mostrando {{ cursosFiltrados.length }} de {{ cursos.length }} cursos
    </p>
    <slot :cursos="cursosFiltrados" />
  </section>
</template>

<style scoped>
.course-filters { min-width: 0; }
.filter-controls { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; padding: 16px 20px; border-bottom: 1px solid #e4dce4; background: #fffdf9; }
.search-field { display: flex; flex: 1 1 250px; align-items: center; gap: 9px; min-width: 190px; min-height: 40px; padding: 0 11px; border: 1px solid #d5dfdf; border-radius: 6px; background: #fff; }
.search-field:focus-within, .filter-field select:focus { outline: 2px solid #9466a044; border-color: #9466a0; }
.search-icon { color: #704c78; font-size: 22px; line-height: 1; }
.search-field input { width: 100%; min-width: 0; border: 0; outline: 0; color: #33213b; background: transparent; font: inherit; font-size: 13px; }
.filter-field { display: grid; gap: 5px; min-width: 140px; color: #715d78; font-size: 11px; }
.filter-field select { min-height: 40px; padding: 0 10px; border: 1px solid #d5dfdf; border-radius: 6px; color: #493550; background: #fff; font: inherit; font-size: 12px; }
.clear-filters { min-height: 38px; padding: 0 10px; border: 0; color: #704c78; background: transparent; font: inherit; font-size: 12px; cursor: pointer; }
.results-count { margin: 0; padding: 10px 20px 0; color: #715d78; font-size: 11px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
@media (max-width: 580px) { .filter-controls { align-items: stretch; flex-direction: column; padding: 13px; }.search-field, .filter-field { width: 100%; }.results-count { padding-right: 13px; padding-left: 13px; } }
</style>
