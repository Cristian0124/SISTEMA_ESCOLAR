<script setup lang="ts">
import { computed, ref } from 'vue'
import CourseCard from '@/components/CourseCard.vue'
import { useCoursesStore } from '@/stores/courses.store'

const store = useCoursesStore()
const busqueda = ref('')
const vista = ref<'pensum' | 'oferta'>('pensum')
const semestreActivo = ref('I')

const pensum = [
  {
    id: 'I',
    materias: [
      { nombre: 'Matemáticas fundamentales', creditos: 3 },
      { nombre: 'Introducción a la ingeniería', creditos: 3 },
      { nombre: 'Pensamiento sistémico', creditos: 3 },
      { nombre: 'Matemáticas discretas', creditos: 3 },
      { nombre: 'Algoritmos y programación I', creditos: 3 },
    ],
  },
  {
    id: 'II',
    materias: [
      { nombre: 'Cálculo I', creditos: 3 },
      { nombre: 'Física y laboratorio I', creditos: 4 },
      { nombre: 'Algoritmos y programación I', creditos: 3 },
      { nombre: 'Álgebra lineal', creditos: 3 },
      { nombre: 'Estadística y probabilidad', creditos: 3 },
    ],
  },
  {
    id: 'III',
    materias: [
      { nombre: 'Inglés I', creditos: 3 },
      { nombre: 'Cálculo II', creditos: 3 },
      { nombre: 'Física y laboratorio II', creditos: 4 },
      { nombre: 'Fundamentos de sistemas de información', creditos: 3 },
      { nombre: 'Estructura de datos', creditos: 3 },
    ],
  },
  {
    id: 'IV',
    materias: [
      { nombre: 'Inglés II', creditos: 3 },
      { nombre: 'Ecuaciones diferenciales', creditos: 3 },
      { nombre: 'Proyecto integrador básico', creditos: 3 },
      { nombre: 'Bases de datos', creditos: 3 },
      { nombre: 'Análisis de algoritmos', creditos: 3 },
    ],
  },
  {
    id: 'V',
    materias: [
      { nombre: 'Inglés III', creditos: 3 },
      { nombre: 'Electiva de área I', creditos: 3 },
      { nombre: 'Autómatas y lenguajes formales', creditos: 3 },
      { nombre: 'Ingeniería de software I', creditos: 3 },
      { nombre: 'Arquitectura de tecnología informática', creditos: 3 },
    ],
  },
  {
    id: 'VI',
    materias: [
      { nombre: 'Inglés IV', creditos: 3 },
      { nombre: 'Razonamiento cuantitativo', creditos: 3 },
      { nombre: 'Constitución política', creditos: 2 },
      { nombre: 'Redes y comunicaciones', creditos: 3 },
      { nombre: 'Ingeniería de software II', creditos: 3 },
      { nombre: 'Arquitectura de computadores', creditos: 3 },
    ],
  },
  {
    id: 'VII',
    materias: [
      { nombre: 'Lenguajes de programación', creditos: 3 },
      { nombre: 'Sistemas operativos', creditos: 3 },
      { nombre: 'Inteligencia artificial', creditos: 3 },
      { nombre: 'Redes inalámbricas', creditos: 3 },
      { nombre: 'Arquitectura de software', creditos: 3 },
      { nombre: 'Gestión de proyectos de TI', creditos: 3 },
    ],
  },
  {
    id: 'VIII',
    materias: [
      { nombre: 'Proyecto integrador profesional', creditos: 3 },
      { nombre: 'Investigación de operaciones', creditos: 3 },
      { nombre: 'Computación móvil', creditos: 3 },
      { nombre: 'Programación orientada a la web', creditos: 3 },
      { nombre: 'Gobierno y servicios de TI', creditos: 3 },
    ],
  },
  {
    id: 'IX',
    materias: [
      { nombre: 'Electiva de profundización I', creditos: 3 },
      { nombre: 'Electiva de profundización II', creditos: 3 },
      { nombre: 'Seguridad en redes', creditos: 3 },
      { nombre: 'Electiva de profundización III', creditos: 3 },
      { nombre: 'Arquitectura empresarial', creditos: 3 },
    ],
  },
  {
    id: 'X',
    materias: [
      { nombre: 'Electiva de profundización IV', creditos: 3 },
      { nombre: 'Electiva de profundización V', creditos: 3 },
      { nombre: 'Electiva de profundización VI', creditos: 3 },
      { nombre: 'Proyecto integrador de grado', creditos: 3 },
    ],
  },
]

const semestreSeleccionado = computed(() => pensum.find((semestre) => semestre.id === semestreActivo.value) ?? pensum[0])
const materiasFiltradas = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase()
  if (!termino) return semestreSeleccionado.value.materias
  return semestreSeleccionado.value.materias.filter((materia) => materia.nombre.toLocaleLowerCase().includes(termino))
})

const cursosFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase()
  if (!termino) return store.cursos

  return store.cursos.filter((curso) =>
    [curso.codigo, curso.nombre, curso.docente, curso.horario]
      .some((campo) => campo.toLocaleLowerCase().includes(termino)),
  )
})

function limpiarFiltros() {
  busqueda.value = ''
}

async function mostrarOferta() {
  vista.value = 'oferta'
  if (!store.hayCursos && !store.cargando) await store.cargarCursos()
}
</script>

<template>
  <main class="catalog-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Catálogo académico</p>
        <h1>Ingeniería de Sistemas</h1>
        <p class="intro">Consulta las materias por semestre y revisa la oferta académica del periodo.</p>
      </div>
      <div class="program-total" aria-label="Programa de 10 semestres y 154 créditos">
        <strong>154</strong>
        <span>créditos</span>
      </div>
    </header>

    <section class="program-facts" aria-label="Datos del programa">
      <div><span>Duración</span><strong>10 semestres</strong></div>
      <div><span>Modalidad</span><strong>Presencial</strong></div>
    </section>

    <nav class="catalog-tabs" aria-label="Vistas del catálogo">
      <button
        type="button"
        :aria-pressed="vista === 'pensum'"
        :class="{ 'tab-active': vista === 'pensum' }"
        @click="vista = 'pensum'; limpiarFiltros()"
      >Plan de estudios</button>
      <button
        type="button"
        :aria-pressed="vista === 'oferta'"
        :class="{ 'tab-active': vista === 'oferta' }"
        @click="mostrarOferta"
      >Oferta vigente</button>
    </nav>

    <section v-if="vista === 'pensum'" class="curriculum" aria-label="Plan de estudios de Ingeniería de Sistemas">
      <div class="semester-picker" aria-label="Seleccionar semestre">
        <button
          v-for="(semestre, indice) in pensum"
          :key="semestre.id"
          type="button"
          :aria-pressed="semestreActivo === semestre.id"
          :class="{ 'semester-active': semestreActivo === semestre.id }"
          @click="semestreActivo = semestre.id; limpiarFiltros()"
        >
          <span>{{ String(indice + 1).padStart(2, '0') }}</span>
          <strong>{{ semestre.id }}</strong>
        </button>
      </div>

      <div class="curriculum-heading">
        <div>
          <p class="eyebrow">Ruta académica</p>
          <h2>Semestre {{ semestreSeleccionado.id }}</h2>
        </div>
        <span class="subject-count">{{ semestreSeleccionado.materias.length }} asignaturas</span>
      </div>

      <div class="toolbar curriculum-toolbar">
        <label class="search-field">
          <span class="search-icon" aria-hidden="true">⌕</span>
          <span class="visually-hidden">Buscar asignatura en el semestre</span>
          <input v-model="busqueda" type="search" placeholder="Buscar asignatura en este semestre" />
          <button v-if="busqueda" class="clear-search" type="button" aria-label="Limpiar búsqueda" @click="limpiarFiltros">×</button>
        </label>
        <p class="toolbar-hint">Asignaturas organizadas por semestre</p>
      </div>

      <div v-if="materiasFiltradas.length" class="subject-list" aria-live="polite">
        <div class="subject-list-header" aria-hidden="true">
          <span>#</span><span>Asignatura</span><span>Créditos</span>
        </div>
        <div v-for="(materia, indice) in materiasFiltradas" :key="materia.nombre" class="subject-row">
          <span class="subject-index">{{ String(indice + 1).padStart(2, '0') }}</span>
          <strong>{{ materia.nombre }}</strong>
          <span class="credit-value">{{ materia.creditos }} <small>cr.</small></span>
        </div>
      </div>
      <div v-else class="empty-state">
        <strong>No encontramos asignaturas</strong>
        <span>Prueba con otro término o cambia de semestre.</span>
        <button class="retry-button" type="button" @click="limpiarFiltros">Limpiar filtros</button>
      </div>
      <p class="source-note">Malla curricular organizada en 10 semestres.</p>
    </section>

    <section v-else class="catalog-content" aria-label="Cursos disponibles">
      <div class="toolbar">
        <label class="search-field">
          <span class="search-icon" aria-hidden="true">⌕</span>
          <span class="visually-hidden">Buscar cursos ofertados</span>
          <input v-model="busqueda" type="search" placeholder="Buscar por código, nombre o docente" />
          <button v-if="busqueda" class="clear-search" type="button" aria-label="Limpiar búsqueda" @click="busqueda = ''">×</button>
        </label>
        <p class="toolbar-hint">{{ store.cursos.length }} cursos en oferta</p>
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
        <span>La oferta del periodo aparecerá aquí cuando esté publicada.</span>
      </div>

      <div v-else-if="cursosFiltrados.length === 0" class="empty-state">
        <strong>No encontramos coincidencias</strong>
        <span>Prueba con otro código, nombre o docente.</span>
        <button class="retry-button" type="button" @click="limpiarFiltros">Limpiar filtros</button>
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
  flex-wrap: wrap;
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

.program-total {
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

.program-total strong { color: var(--accent); font-size: 25px; line-height: 1.1; }
.program-total span { color: var(--muted); font-size: 11px; }

.program-facts {
  display: flex;
  align-items: center;
  gap: 0;
  margin: 0 0 24px;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.program-facts > div,
.program-facts > a {
  display: grid;
  gap: 5px;
  min-height: 62px;
  align-content: center;
  padding: 0 24px;
  border-right: 1px solid var(--line);
  text-decoration: none;
}

.program-facts > div:first-child { padding-left: 0; }
.program-facts span { color: var(--muted); font-size: 11px; }
.program-facts strong { color: var(--ink); font-size: 13px; }
.program-facts > a { color: var(--accent); font-size: 12px; font-weight: 700; }
.program-facts > a span { display: inline; color: inherit; font-size: 14px; }

.catalog-tabs {
  display: flex;
  gap: 4px;
  width: fit-content;
  margin: 0 0 18px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #f3f7f7;
}

.catalog-tabs button {
  min-height: 36px;
  padding: 0 15px;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #5d7073;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.catalog-tabs button.tab-active {
  border-color: #dce7e7;
  color: var(--accent);
  background: #fff;
}

.semester-picker {
  display: grid;
  grid-template-columns: repeat(10, minmax(42px, 1fr));
  gap: 7px;
  margin-bottom: 26px;
}

.semester-picker button {
  display: grid;
  min-height: 58px;
  justify-items: center;
  align-content: center;
  gap: 2px;
  border: 1px solid var(--line);
  border-radius: 5px;
  color: #627477;
  background: #fff;
  cursor: pointer;
}

.semester-picker button span { color: #94a1a3; font-size: 9px; }
.semester-picker button strong { font-size: 13px; }
.semester-picker button.semester-active { border-color: var(--accent); color: #fff; background: var(--accent); }
.semester-picker button.semester-active span { color: #d8edf0; }

.curriculum-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.curriculum-heading .eyebrow { margin-bottom: 5px; }
.curriculum-heading h2 { margin: 0; color: var(--ink); font-size: 22px; }
.subject-count { color: var(--muted); font-size: 12px; }
.curriculum-toolbar { border: 1px solid var(--line); border-bottom: 0; }

.subject-list { border: 1px solid var(--line); background: #fff; }
.subject-list-header,
.subject-row { display: grid; grid-template-columns: 56px minmax(0, 1fr) 100px; align-items: center; }
.subject-list-header { min-height: 36px; padding: 0 18px; border-bottom: 1px solid var(--line); color: var(--muted); background: #f7f9f9; font-size: 10px; font-weight: 700; text-transform: uppercase; }
.subject-list-header span:last-child { text-align: right; }
.subject-row { min-height: 58px; padding: 0 18px; border-bottom: 1px solid #edf1f1; }
.subject-row:last-child { border-bottom: 0; }
.subject-index { color: #90a0a2; font-size: 11px; font-variant-numeric: tabular-nums; }
.subject-row strong { min-width: 0; color: #31494d; font-size: 13px; font-weight: 600; }
.credit-value { justify-self: end; color: var(--accent); font-size: 13px; font-weight: 700; }
.credit-value small { color: var(--muted); font-size: 10px; font-weight: 500; }
.source-note { margin: 12px 0 0; color: var(--muted); font-size: 11px; line-height: 1.5; }
.source-note a { color: var(--accent); }

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
  .semester-picker { grid-template-columns: repeat(5, minmax(42px, 1fr)); }
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

  .program-total { flex-basis: 68px; width: 68px; height: 66px; }
  .program-facts > div, .program-facts > a { padding: 0 12px; }
  .program-facts > div:first-child { padding-left: 0; }
  .catalog-tabs { width: 100%; }
  .catalog-tabs button { flex: 1; }
  .semester-picker { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
  .subject-list-header, .subject-row { grid-template-columns: 36px minmax(0, 1fr) 64px; padding-right: 12px; padding-left: 12px; }
  .subject-row strong { font-size: 12px; }

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
.academic-nav { display: flex; flex-wrap: wrap; gap: 18px; margin-bottom: 20px; }
.academic-nav a { color: #176d85; }
select { padding: 8px; border: 1px solid #d5dfdf; border-radius: 6px; background: white; }
</style>
