<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CourseCard from '@/components/CourseCard.vue'
import CourseFilters, { type CourseFilters as CourseFiltersState } from '@/components/CourseFilters.vue'
import { consultarAvancePensum, type MateriaAvance } from '@/api/pensum.api'
import { useCoursesStore } from '@/stores/courses.store'
import { useAuthStore } from '@/stores/auth'
import { useCourseAutoRefresh } from '@/composables/useCourseAutoRefresh'
const store = useCoursesStore()
const auth = useAuthStore()
const filtrosCursos = ref<CourseFiltersState>({ busqueda: '', semestre: '', disponibilidad: 'todos' })
const seleccion = ref<number[]>([])
const confirmando = ref(false)
const enviando = ref(false)
const error = ref('')
const exitos = ref<string[]>([])
const sesionRequerida = ref(false)
const avanceMaterias = ref<MateriaAvance[]>([])
const cargandoAvance = ref(false)
const avanceCargado = ref(false)
const errorAvance = ref('')
useCourseAutoRefresh(() => true, () => enviando.value)
const seleccionados = computed(() => store.cursos.filter(c => seleccion.value.includes(c.id)))
const apiBaseUrl = (import.meta.env.VITE_API_URL
  ?? `${window.location.protocol}//${window.location.hostname}:3000/api`).replace(/\/+$/, '')
const totalCreditos = computed(() => {
  const valores = seleccionados.value.map(c => (c as typeof c & { creditos?: number }).creditos)
  return valores.length > 0 && valores.every((v): v is number => typeof v === 'number') ? valores.reduce((a, b) => a + b, 0) : null
})
function avanceDeCurso(curso: (typeof store.cursos)[number]) {
  return avanceMaterias.value.find((materia) => materia.codigo === curso.codigoPensum)
}

function requisitosPendientes(curso: (typeof store.cursos)[number]) {
  return avanceDeCurso(curso)?.requisitosPendientes ?? []
}

function cursoBloqueado(curso: (typeof store.cursos)[number]) {
  const avance = avanceDeCurso(curso)
  return avance?.bloqueada === true || avance?.aprobada === true
}

async function cargarAvance() {
  cargandoAvance.value = true
  errorAvance.value = ''
  try {
    if (!auth.accessToken) await auth.restaurarSesion()
    if (!auth.accessToken) {
      errorAvance.value = 'Inicia sesión para consultar tus prerrequisitos. El servidor también los validará al confirmar.'
      return
    }
    avanceMaterias.value = await consultarAvancePensum()
    avanceCargado.value = true
  } catch {
    errorAvance.value = 'No se pudo consultar tu avance. El servidor verificará los prerrequisitos al confirmar.'
  } finally {
    cargandoAvance.value = false
  }
}

onMounted(() => {
  void store.cargarCursos()
  void cargarAvance()
})

async function confirmarMatricula(cursoId: number): Promise<Response> {
  if (!auth.accessToken) await auth.restaurarSesion()
  if (!auth.accessToken) {
    sesionRequerida.value = true
    throw new Error('Inicia sesión para confirmar la matrícula. Tu selección se conserva.')
  }

  const solicitar = () => fetch(`${apiBaseUrl}/matriculas`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.accessToken}`,
    },
    body: JSON.stringify({ cursoId }),
  })

  let respuesta = await solicitar()
  if (respuesta.status === 401) {
    await auth.restaurarSesion()
    if (!auth.accessToken) {
      sesionRequerida.value = true
      return respuesta
    }
    respuesta = await solicitar()
  }
  return respuesta
}

async function matricular() {
  if (enviando.value || !seleccionados.value.length) return
  enviando.value = true; error.value = ''; exitos.value = []; sesionRequerida.value = false; confirmando.value = false
  if (!avanceCargado.value && auth.accessToken) await cargarAvance()
  // Una petición por curso: se conservan los pendientes si hay un fallo parcial.
  const pendientes = [...seleccionados.value]
  try {
    for (const curso of pendientes) {
      if (curso.cuposDisponibles <= 0) { error.value = `${curso.nombre} ya no tiene cupos.`; break }
      const respuesta = await confirmarMatricula(curso.id)
      if (!respuesta.ok) {
        const cuerpo: unknown = await respuesta.json().catch(() => null)
        const mensaje = typeof cuerpo === 'object' && cuerpo !== null && 'mensaje' in cuerpo
          && typeof cuerpo.mensaje === 'string'
          ? cuerpo.mensaje
          : 'No fue posible confirmar el curso seleccionado.'
        error.value = respuesta.status === 401
          ? 'Inicia sesión para confirmar la matrícula. Tu selección se conserva.'
          : respuesta.status === 501
            ? 'El servidor todavía no permite registrar matrículas. Tu selección se conserva.'
            : mensaje
        break
      }
      exitos.value.push(curso.nombre)
      seleccion.value = seleccion.value.filter(id => id !== curso.id)
    }
  } catch (e) {
    error.value = e instanceof Error
      ? e.message
      : 'No fue posible confirmar el curso pendiente. Consulta Mis matrículas antes de reintentar para comprobar si se registró.'
  } finally {
    await store.cargarCursos()
    enviando.value = false
  }
}
</script>
<template>
  <main class="academic-page">
    <RouterLink class="back-link" to="/inicio">← Volver al inicio</RouterLink>
    <h1>Matrícula</h1><p class="intro">Selecciona tus cursos y revisa el resumen antes de confirmar.</p>
    <p v-if="cargandoAvance" class="notice" role="status">Consultando tus prerrequisitos…</p>
    <p v-else-if="errorAvance" class="notice" role="status">{{ errorAvance }}</p>
    <p v-if="store.cargando" role="status">Cargando oferta académica…</p>
    <div v-else-if="store.error" class="notice error" role="alert">{{ store.error }} <button :disabled="enviando" @click="store.cargarCursos">Reintentar</button></div>
    <p v-else-if="!store.cursos.length">No hay cursos publicados.</p>
    <CourseFilters
      v-else
      v-model="filtrosCursos"
      :cursos="store.cursos"
      v-slot="{ cursos: cursosFiltrados }"
    >
      <div v-if="cursosFiltrados.length" class="grid">
        <div v-for="curso in cursosFiltrados" :key="curso.id" class="choice">
          <CourseCard :curso="curso" />
          <label><input v-model="seleccion" type="checkbox" :value="curso.id" :disabled="enviando || confirmando || cargandoAvance || curso.cuposDisponibles <= 0 || cursoBloqueado(curso)" />{{ curso.cuposDisponibles > 0 ? `Seleccionar ${curso.nombre}` : 'Sin cupos disponibles' }}</label>
          <p v-if="avanceDeCurso(curso)?.aprobada" class="prerequisite-state state-passed">Materia aprobada; no necesitas volver a matricularla.</p>
          <p v-else-if="requisitosPendientes(curso).length" class="prerequisite-state state-locked">Bloqueada. Aprueba primero: {{ requisitosPendientes(curso).join(', ') }}.</p>
          <p v-else-if="avanceCargado && curso.codigoPensum" class="prerequisite-state state-available">Prerrequisitos cumplidos.</p>
        </div>
      </div>
      <div v-else class="notice">No encontramos cursos con ese nombre o esos filtros.</div>
    </CourseFilters>
    <section class="summary" aria-label="Resumen de matrícula">
      <h2>Resumen de matrícula</h2>
      <p v-if="!seleccionados.length">Todavía no has seleccionado cursos.</p>
      <ul><li v-for="curso in seleccionados" :key="curso.id">{{ curso.codigo }} — {{ curso.nombre }} · {{ curso.horario }}</li></ul>
      <p>Cursos seleccionados: {{ seleccionados.length }}</p><p>Total de créditos: {{ totalCreditos ?? 'No disponible: el catálogo no informa todos los créditos.' }}</p>
      <button :disabled="!seleccionados.length || enviando || store.cargando || !!store.error || confirmando" @click="confirmando = true; error = ''; exitos = []">Revisar confirmación</button>
      <div v-if="confirmando" class="notice" role="region" aria-label="Confirmación de matrícula">
        <p>¿Confirmas la matrícula de los {{ seleccionados.length }} cursos seleccionados?</p>
        <button @click="matricular">Confirmar matrícula</button><button @click="confirmando = false">Volver a la selección</button>
      </div>
    </section>
    <p v-if="enviando" role="status">Registrando matrícula…</p>
    <p v-if="error" class="notice error" role="alert">
      {{ error }}
      <RouterLink v-if="sesionRequerida" to="/login">Iniciar sesión</RouterLink>
    </p>
    <div v-if="exitos.length" class="notice success" role="status">El servidor confirmó: {{ exitos.join(', ') }}. <RouterLink to="/mis-matriculas">Ver mis matrículas</RouterLink></div>
  </main>
</template>

<style scoped>
.academic-page { max-width: 1120px; margin: auto; padding: 28px 18px; color: #243a3c; }
.back-link { display: inline-block; margin-bottom: 18px; color: #176d85; font-size: 13px; text-decoration: none; }
.back-link:hover { text-decoration: underline; }
a { color: #176d85; }
h1 { margin-bottom: 8px; } .intro { color: #536b6e; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin: 20px 0; }
.choice, .summary, .notice, .enrollment { padding: 16px; border: 1px solid #dfe7e7; border-radius: 8px; background: #fff; margin: 16px 0; }
.choice { margin: 0; padding: 10px; } .choice label { display: flex; gap: 8px; padding: 12px 2px; align-items: center; }
.prerequisite-state { margin: 0 2px 10px; font-size: 12px; line-height: 1.45; }
.state-passed { color: #246c4a; }.state-locked { color: #925b13; }.state-available { color: #176d85; }
button { padding: 10px 16px; border: 1px solid #176d85; border-radius: 6px; background: #176d85; color: white; cursor: pointer; margin: 5px; font: inherit; }
button:disabled { opacity: .55; cursor: not-allowed; } button:focus-visible, a:focus-visible { outline: 3px solid #d5a348; outline-offset: 3px; }
.error { color: #8d3028; background: #fff4f2; } .success { color: #246c4a; background: #eaf5ee; }
li { margin: 10px 0; } .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
</style>
