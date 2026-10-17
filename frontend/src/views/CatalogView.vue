<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CourseCard from '@/components/CourseCard.vue'
import { useCoursesStore } from '@/stores/courses.store'

const store = useCoursesStore()
const busqueda = ref('')

const cursosFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase()
  if (!termino) return store.cursos

  return store.cursos.filter((curso) =>
    [curso.codigo, curso.nombre, curso.docente, curso.horario]
      .some((campo) => campo.toLocaleLowerCase().includes(termino)),
  )
})

onMounted(() => {
  if (!store.hayCursos) void store.cargarCursos()
})
</script>

<template>
  <main class="catalog-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Oferta académica</p>
        <h1>Consulta de cursos</h1>
        <p class="intro">Encuentra un curso y revisa su docente, horario y disponibilidad.</p>
      </div>
      <div class="course-total" aria-live="polite">
        <strong>{{ cursosFiltrados.length }}</strong>
        <span>{{ cursosFiltrados.length === 1 ? 'curso' : 'cursos' }}</span>
      </div>
    </header>

    <section class="catalog-content" aria-label="Cursos disponibles">
      <div class="toolbar">
        <label class="search-field">
          <span class="search-icon" aria-hidden="true">⌕</span>
          <span class="visually-hidden">Buscar cursos</span>
          <input
            v-model="busqueda"
            type="search"
            placeholder="Buscar por código, nombre o docente"
          />
          <button v-if="busqueda" class="clear-search" type="button" aria-label="Limpiar búsqueda" @click="busqueda = ''">
            ×
          </button>
        </label>
        <p class="toolbar-hint">{{ store.cursos.length }} cursos en la oferta</p>
      </div>

      <div v-if="store.cargando" class="empty-state" role="status">
        <span class="loader" aria-hidden="true"></span>
        <strong>Cargando cursos</strong>
        <span>Estamos consultando la oferta académica.</span>
      </div>

      <div v-else-if="store.error" class="empty-state empty-state-error" role="alert">
        <strong>No pudimos cargar los cursos</strong>
        <span>{{ store.error }}</span>
        <button class="retry-button" type="button" @click="store.cargarCursos">Intentar de nuevo</button>
      </div>

      <div v-else-if="store.cursos.length === 0" class="empty-state">
        <strong>No hay cursos disponibles</strong>
        <span>La oferta académica aparecerá aquí cuando esté publicada.</span>
      </div>

      <div v-else-if="cursosFiltrados.length === 0" class="empty-state">
        <strong>No encontramos coincidencias</strong>
        <span>Prueba con otro código, nombre o docente.</span>
        <button class="retry-button" type="button" @click="busqueda = ''">Limpiar búsqueda</button>
      </div>

      <div v-else class="course-grid" aria-live="polite">
        <CourseCard v-for="curso in cursosFiltrados" :key="curso.id" :curso="curso" />
      </div>
    </section>
  </main>
</template>

<style scoped>
.catalog-page {
  --ink: #243a3c;
  --muted: #718083;
  --line: #dfe7e7;
  --accent: #176d85;
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: clamp(24px, 4vw, 48px);
  color: var(--ink);
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

/* Encabezado y contador */
.eyebrow {
  margin: 0 0 8px;
  color: var(--accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(27px, 3vw, 36px);
  letter-spacing: -.035em;
}

.intro {
  margin: 9px 0 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.5;
}

.course-total {
  display: grid;
  flex: 0 0 86px;
  width: 86px;
  height: 78px;
  align-content: center;
  justify-items: center;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
}

.course-total strong {
  color: var(--accent);
  font-size: 25px;
  line-height: 1.1;
}

.course-total span {
  color: var(--muted);
  font-size: 11px;
}

/* Contenedor de búsqueda y resultados */
.catalog-content {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
  background: #fbfcfc;
}

.search-field {
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(440px, 100%);
  min-height: 40px;
  padding: 0 11px;
  border: 1px solid #d5dfdf;
  border-radius: 6px;
  background: #fff;
}

.search-icon {
  color: var(--accent);
  font-size: 23px;
  line-height: 1;
}

.search-field input {
  flex: 1;
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--ink);
  background: transparent;
  font: inherit;
  font-size: 13px;
}

.search-field:focus-within {
  border-color: #63a8b8;
  box-shadow: 0 0 0 3px rgb(23 109 133 / 10%);
}

.clear-search {
  border: 0;
  color: var(--muted);
  background: transparent;
  font-size: 20px;
  cursor: pointer;
}

.toolbar-hint {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}

/* Tarjetas y estados de la consulta */
.course-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 20px;
  background: #f8fafa;
}

.empty-state {
  display: grid;
  justify-items: center;
  gap: 8px;
  min-height: 230px;
  align-content: center;
  padding: 24px;
  color: var(--muted);
  text-align: center;
}

.empty-state strong {
  color: var(--ink);
  font-size: 15px;
}

.empty-state span {
  font-size: 13px;
}

.empty-state-error strong {
  color: #9d453c;
}

.retry-button {
  margin-top: 8px;
  padding: 9px 14px;
  border: 1px solid #c8dada;
  border-radius: 5px;
  color: var(--accent);
  background: #fff;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.retry-button:hover {
  background: #f0f8f9;
}

.loader {
  width: 22px;
  height: 22px;
  border: 2px solid #d9e9eb;
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Ajustes para tabletas y móviles */
@media (max-width: 760px) {
  .course-grid {
    grid-template-columns: 1fr;
    padding: 14px;
  }
}

@media (max-width: 520px) {
  .catalog-page {
    padding: 22px 14px;
  }

  .page-heading {
    align-items: flex-start;
    margin-bottom: 20px;
  }

  .course-total {
    flex-basis: 68px;
    width: 68px;
    height: 66px;
  }

  .toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 9px;
    padding: 13px;
  }

  .search-field {
    width: 100%;
  }

  .toolbar-hint {
    padding-left: 2px;
  }
}
</style>
