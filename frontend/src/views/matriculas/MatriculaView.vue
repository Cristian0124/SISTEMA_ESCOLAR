<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import TarjetaCurso from '@/components/TarjetaCurso.vue'
import FiltrosCursos, { type FiltrosCursos as EstadoFiltrosCursos } from '@/components/FiltrosCursos.vue'
import { consultarAvancePensum, type MateriaAvance } from '@/api/pensum.api'
import { useCursosStore } from '@/stores/cursos.store'
import { useAutenticacionStore } from '@/stores/autenticacion.store'
import { useActualizacionCursos } from '@/composables/useActualizacionCursos'
import { obtenerMisCreditos, type ResumenCreditos } from '@/api/creditos.api'
import { crearMatricula } from '@/api/matriculas.api'
import { isAxiosError } from 'axios'
const store = useCursosStore()
const auth = useAutenticacionStore()
const filtrosCursos = ref<EstadoFiltrosCursos>({ busqueda: '', semestre: '', disponibilidad: 'todos' })
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
const balanceCreditos = ref<ResumenCreditos | null>(null)
const cargandoCreditos = ref(false)
const errorCreditos = ref('')
useActualizacionCursos(() => true, () => enviando.value)
const seleccionados = computed(() => store.cursos.filter(c => seleccion.value.includes(c.id)))
const totalCreditos = computed(() => {
  const valores = seleccionados.value.map(c => (c as typeof c & { creditos?: number }).creditos)
  return valores.length > 0 && valores.every((v): v is number => typeof v === 'number') ? valores.reduce((a, b) => a + b, 0) : null
})
function avanceDeCurso(curso: (typeof store.cursos)[number]) {
  return avanceMaterias.value.find((materia) => materia.codigo === curso.codigoPensum)
}

function motivoBloqueoCurso(curso: (typeof store.cursos)[number]): string {
  if (curso.cuposDisponibles <= 0) return 'Sin cupos disponibles.'
  if (cargandoAvance.value) return 'Consultando tus prerrequisitos…'
  const avance = avanceDeCurso(curso)
  if (avance?.aprobada) return 'Materia aprobada; no necesitas volver a matricularla.'
  if (avance?.requisitosPendientes.length) {
    return `Aprueba primero: ${avance.requisitosPendientes.join(', ')}.`
  }
  if (avance?.bloqueada) return 'Esta materia tiene prerrequisitos pendientes.'
  if (cargandoCreditos.value) return 'Consultando tus créditos disponibles…'
  if (!balanceCreditos.value) {
    // Una consulta fallida permite preparar la selección; el servidor comprueba el saldo al confirmar.
    return errorCreditos.value ? '' : 'Esperando la consulta de créditos disponibles.'
  }
  if (typeof curso.creditos !== 'number') return 'El catálogo no informa los créditos de este curso. Solicita su revisión a la administración.'
  if (seleccion.value.includes(curso.id)) return ''
  const disponibles = Math.max(0, balanceCreditos.value.creditosDisponibles - (totalCreditos.value ?? 0))
  if (curso.creditos > disponibles) {
    return `Este curso requiere ${curso.creditos} créditos y quedan ${disponibles} disponibles para tu selección.`
  }
  return ''
}

async function cargarBalanceCreditos() {
  cargandoCreditos.value = true
  errorCreditos.value = ''
  try {
    if (!auth.accessToken) await auth.restaurarSesion()
    if (auth.usuario?.rol !== 'estudiante') return
    balanceCreditos.value = await obtenerMisCreditos()
  } catch {
    balanceCreditos.value = null
    errorCreditos.value = 'No se pudo consultar tu cupo de créditos. El servidor validará el saldo al confirmar.'
  } finally {
    cargandoCreditos.value = false
  }
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
  void cargarBalanceCreditos()
})

async function confirmarMatricula(cursoId: number): Promise<void> {
  if (!auth.accessToken) await auth.restaurarSesion()
  if (!auth.accessToken) {
    sesionRequerida.value = true
    throw new Error('Inicia sesión para confirmar la matrícula. Tu selección se conserva.')
  }

  await crearMatricula(cursoId)
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
      try {
        await confirmarMatricula(curso.id)
      } catch (fallo) {
        if (!isAxiosError(fallo)) throw fallo
        const cuerpo: unknown = fallo.response?.data
        const mensaje = typeof cuerpo === 'object' && cuerpo !== null && 'mensaje' in cuerpo
          && typeof cuerpo.mensaje === 'string'
          ? cuerpo.mensaje
          : 'No fue posible confirmar el curso seleccionado.'
        sesionRequerida.value = fallo.response?.status === 401
        error.value = fallo.response?.status === 401
          ? 'Inicia sesión para confirmar la matrícula. Tu selección se conserva.'
          : fallo.response?.status === 501
            ? 'El servidor todavía no permite registrar matrículas. Tu selección se conserva.'
            : !fallo.response
              ? 'No fue posible confirmar el curso pendiente. Consulta tu horario antes de reintentar para comprobar si se registró.'
              : `${curso.nombre}: ${mensaje}`
        break
      }
      exitos.value.push(curso.nombre)
      seleccion.value = seleccion.value.filter(id => id !== curso.id)
    }
  } catch (e) {
    error.value = e instanceof Error
      ? e.message
      : 'No fue posible confirmar el curso pendiente. Consulta tu horario antes de reintentar para comprobar si se registró.'
  } finally {
    await store.cargarCursos()
    await cargarBalanceCreditos()
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
    <FiltrosCursos
      v-else
      v-model="filtrosCursos"
      :cursos="store.cursos"
      v-slot="{ cursos: cursosFiltrados }"
    >
      <div v-if="cursosFiltrados.length" class="grid">
        <div v-for="curso in cursosFiltrados" :key="curso.id" class="choice">
          <TarjetaCurso :curso="curso" />
          <label>
            <input
              v-model="seleccion"
              type="checkbox"
              :value="curso.id"
              :aria-describedby="`estado-curso-${curso.id}`"
              :disabled="enviando || confirmando || (!seleccion.includes(curso.id) && !!motivoBloqueoCurso(curso))"
            />
            {{ curso.cuposDisponibles > 0 ? `Seleccionar ${curso.nombre}` : 'Sin cupos disponibles' }}
          </label>
          <p v-if="motivoBloqueoCurso(curso)" :id="`estado-curso-${curso.id}`" class="prerequisite-state state-locked">
            {{ motivoBloqueoCurso(curso) }}
          </p>
          <p v-else :id="`estado-curso-${curso.id}`" class="prerequisite-state state-available">
            {{ avanceCargado && avanceDeCurso(curso) && !errorCreditos ? 'Prerrequisitos cumplidos.' : 'El servidor validará los requisitos y créditos al confirmar.' }}
          </p>
        </div>
      </div>
      <div v-else class="notice">No encontramos cursos con ese nombre o esos filtros.</div>
    </FiltrosCursos>
    <section class="summary" aria-label="Resumen de matrícula">
      <h2>Resumen de matrícula</h2>
      <p v-if="cargandoCreditos" role="status">Consultando tus créditos disponibles…</p>
      <p v-else-if="balanceCreditos">Semestre de referencia: {{ balanceCreditos.semestre }}° · Cupo total: {{ balanceCreditos.creditosBase + balanceCreditos.creditosExtra }} créditos · Matriculados: {{ balanceCreditos.creditosMatriculados }} · Disponibles: {{ balanceCreditos.creditosDisponibles }}</p>
      <div v-else-if="errorCreditos" class="credit-warning" role="status">
        <p>{{ errorCreditos }}</p>
        <button type="button" :disabled="enviando" @click="cargarBalanceCreditos">Reintentar consulta de créditos</button>
      </div>
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
    <div v-if="exitos.length" class="notice success" role="status">El servidor confirmó: {{ exitos.join(', ') }}. <RouterLink to="/schedule">Ver mi horario</RouterLink></div>
  </main>
</template>

<style scoped>
.academic-page { max-width: 1120px; margin: auto; padding: 28px 18px; color: var(--school-ink); }
.back-link { display: inline-block; margin-bottom: 18px; color: var(--school-blue); font-size: 13px; text-decoration: none; }
.back-link:hover { text-decoration: underline; }
a { color: var(--school-blue); }
h1 { margin-bottom: 8px; } .intro { color: var(--school-muted); }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin: 20px 0; }
.choice, .summary, .notice, .enrollment { padding: 16px; border: 1px solid var(--school-border); border-radius: 8px; background: #fff; margin: 16px 0; }
.choice { margin: 0; padding: 10px; } .choice label { display: flex; gap: 8px; padding: 12px 2px; align-items: center; }
.prerequisite-state { margin: 0 2px 10px; font-size: 12px; line-height: 1.45; }
.state-locked { color: #8b641f; }.state-available { color: var(--school-blue); }.credit-warning { color: #8b641f; font-size: 12px; }
button { padding: 10px 16px; border: 1px solid var(--school-blue); border-radius: 6px; background: var(--school-blue); color: white; cursor: pointer; margin: 5px; font: inherit; }
button:disabled { opacity: .55; cursor: not-allowed; } button:focus-visible, a:focus-visible { outline: 3px solid #d5a348; outline-offset: 3px; }
.error { color: #8d3028; background: #fff4f2; } .success { color: #426a50; background: #edf3e9; }
li { margin: 10px 0; } .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
</style>
