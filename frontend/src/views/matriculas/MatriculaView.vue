<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { isAxiosError } from 'axios'
import { useCursosStore } from '@/stores/cursos.store'
import { useMatriculasStore } from '@/stores/matriculas.store'
import { useAutenticacionStore } from '@/stores/autenticacion.store'
import { consultarPeriodo, type PeriodoMatricula } from '@/api/monitoreo.api'

const cursos = useCursosStore()
const solicitudes = useMatriculasStore()
const auth = useAutenticacionStore()
const periodo = ref<PeriodoMatricula | null>(null)
const error = ref('')
const aviso = ref('')
const enviando = ref<number | null>(null)
const filtro = ref('')
const visibles = computed(() => cursos.cursos.filter(c => c.nombre.toLowerCase().includes(filtro.value.toLowerCase())))
let temporizador: ReturnType<typeof setInterval> | undefined
let actualizando = false
let desmontado = false
async function actualizar() {
  if (actualizando) return
  actualizando = true
  try {
    const [actual] = await Promise.all([consultarPeriodo(),solicitudes.cargar(),cursos.cargarCursos(false)])
    periodo.value = actual
  } catch { error.value = 'No fue posible consultar el periodo de matrícula.' }
  finally { actualizando = false }
}
function pendiente(cursoId: number) {
  return solicitudes.solicitudes.some(s => s.curso_id === cursoId && ['en_espera','procesando'].includes(s.estado))
}
async function solicitar(cursoId: number) {
  if (!auth.usuario || enviando.value !== null) return
  enviando.value = cursoId
  error.value = ''
  aviso.value = ''
  try {
    await solicitudes.solicitar(cursoId,auth.usuario.id)
    aviso.value = 'Solicitud recibida. Puedes seguir su estado en esta página.'
  } catch (fallo) {
    error.value = isAxiosError<{ mensaje?: string }>(fallo)
      ? fallo.response?.data.mensaje ?? 'No se pudo confirmar la recepción. Reintenta para consultar la misma solicitud.'
      : 'No fue posible enviar la solicitud.'
  } finally { enviando.value = null }
}
onMounted(async () => {
  await actualizar()
  if (!desmontado) temporizador = setInterval(() => { void actualizar() }, 3000)
})
onUnmounted(() => { desmontado = true; clearInterval(temporizador) })
</script>

<template>
  <main class="mass-page">
    <RouterLink to="/inicio">Volver al inicio</RouterLink>
    <h1>Matrícula masiva</h1>
    <p v-if="periodo">
      Periodo {{ periodo.codigo }} · {{ periodo.abierto ? 'Matrícula abierta' : 'Matrícula cerrada' }}.
      Apertura {{ new Date(periodo.apertura).toLocaleString() }}.
      Cierre {{ new Date(periodo.cierre).toLocaleString() }}.
    </p>
    <p v-else>La administración todavía no ha configurado el periodo.</p>
    <p>Enviar una solicitud inicia el proceso. La inscripción queda lista cuando su estado es confirmada.</p>
    <p v-if="error || solicitudes.error || cursos.error" role="alert">{{ error || solicitudes.error || cursos.error }}</p>
    <p v-if="aviso" role="status">{{ aviso }}</p>
    <h2>Mis solicitudes</h2>
    <RouterLink to="/schedule">Consultar mi horario confirmado</RouterLink>
    <p v-if="!solicitudes.solicitudes.length">Todavía no tienes solicitudes.</p>
    <ul class="requests">
      <li v-for="s in solicitudes.solicitudes" :key="s.id">
        <strong>{{ s.materia }} · {{ s.curso_codigo }}</strong>
        <span>{{ s.estado.replace('_',' ') }}</span>
        <p v-if="s.motivo">{{ s.motivo }}</p>
      </li>
    </ul>
    <h2>Oferta de cursos</h2>
    <label>Buscar materia <input v-model="filtro" type="search" /></label>
    <p v-if="cursos.cargando && !cursos.cursos.length">Cargando cursos…</p>
    <div class="course-grid">
      <article v-for="c in visibles" :key="c.id">
        <h3>{{ c.nombre }}</h3>
        <p>{{ c.codigo }} · {{ c.creditos }} créditos</p>
        <p>{{ c.horario }} · {{ c.docente ?? 'Docente pendiente' }}</p>
        <p>{{ c.cuposDisponibles }} cupos libres</p>
        <button :disabled="!periodo?.abierto || enviando !== null || pendiente(c.id) || c.cuposDisponibles <= 0" @click="solicitar(c.id)">
          {{ pendiente(c.id) ? 'Solicitud en proceso' : enviando === c.id ? 'Enviando…' : 'Solicitar matrícula' }}
        </button>
      </article>
    </div>
  </main>
</template>

<style scoped>
.mass-page { max-width:1100px; margin:auto; padding:28px; color:#233f4a }
.course-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:16px; margin-top:20px }
article,.requests li { border:1px solid #cbd9de; border-radius:8px; padding:18px; background:white }
.requests { list-style:none; padding:0; display:grid; gap:10px }
.requests span { display:block; margin-top:8px; font-weight:600 }
button { background:#185a69; color:white; padding:10px 16px; border:0; border-radius:4px; cursor:pointer }
button:disabled { opacity:.5; cursor:default }
input { padding:8px; margin-left:8px; max-width:100% }
[role=alert] { color:#9b2226 }
</style>
