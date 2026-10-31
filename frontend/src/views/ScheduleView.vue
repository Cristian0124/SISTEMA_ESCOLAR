<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { Curso } from '@/api/courses.api'
import { useAuthStore } from '@/stores/auth'

interface Matricula {
  id: number
  curso: Curso
}

interface BloqueHorario {
  id: string
  dia: number
  fila: number
  duracion: number
  curso: Curso
  inicio: string
  fin: string
}

const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const horas = Array.from({ length: 24 }, (_, hora) => `${String(hora).padStart(2, '0')}:00`)
const matriculas = ref<Matricula[]>([])
const cargando = ref(false)
const error = ref('')
const auth = useAuthStore()
const apiBaseUrl = (import.meta.env.VITE_API_URL
  ?? `${window.location.protocol}//${window.location.hostname}:3000/api`).replace(/\/+$/, '')

const bloques = computed(() =>
  matriculas.value.flatMap(({ id, curso }) => crearBloques(curso, id)),
)

function normalizar(valor: string): string {
  return valor.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase()
}

function crearBloques(curso: Curso, matriculaId: number): BloqueHorario[] {
  if (curso.sesiones?.length) {
    return curso.sesiones.map((s,i) => {
      const [h,m] = s.horaInicio.split(':').map(Number)
      const [hf,mf] = s.horaFin.split(':').map(Number)
      return { id: `${matriculaId}-${i}`, dia:s.dia-1, fila:h+2,
        duracion:Math.ceil(hf+mf/60)-Math.floor(h+m/60), curso, inicio:s.horaInicio.slice(0,5), fin:s.horaFin.slice(0,5) }
    })
  }
  const horario = normalizar(curso.horario)
  const intervalo = /(\d{1,2}):([0-5]\d)\s*(?:-|–|—|a)\s*(\d{1,2}):([0-5]\d)/i.exec(horario)
  if (!intervalo) return []

  const horaInicio = Number(intervalo[1])
  const minutoInicio = Number(intervalo[2])
  const horaFin = Number(intervalo[3])
  const minutoFin = Number(intervalo[4])
  const inicio = horaInicio + minutoInicio / 60
  const fin = horaFin + minutoFin / 60
  if (horaInicio > 23 || horaFin > 24 || (horaFin === 24 && minutoFin !== 0) || fin <= inicio) return []

  const diasDelHorario = horario.slice(0, intervalo.index).split(/[/,;|&\s]+|\by\b/)
  const abreviaturas: RegExp[] = [
    /^(lunes|lun)$/,
    /^(martes|mar)$/,
    /^(miercoles|mie|mier)$/,
    /^(jueves|jue|juev)$/,
    /^(viernes|vie|vier)$/,
    /^(sabado|sab)$/,
    /^(domingo|dom)$/,
  ]
  const diasEncontrados = new Set<number>()
  for (const parte of diasDelHorario) {
    const token = parte.replace(/[().]/g, '')
    const dia = abreviaturas.findIndex((abreviatura) => abreviatura.test(token))
    if (dia !== -1) diasEncontrados.add(dia)
  }

  return [...diasEncontrados].map((dia) => ({
    id: `${matriculaId}-${dia}`,
    dia,
    fila: Math.floor(inicio) + 2,
    duracion: Math.ceil(fin) - Math.floor(inicio),
    curso,
    inicio: `${intervalo[1]}:${intervalo[2]}`,
    fin: `${intervalo[3]}:${intervalo[4]}`,
  }))
}

async function cargarHorario(): Promise<void> {
  if (cargando.value) return
  cargando.value = true
  error.value = ''
  try {
    if (!auth.accessToken) await auth.restaurarSesion()
    if (!auth.accessToken) {
      matriculas.value = []
      return
    }

    const consultarMatriculas = () => fetch(`${apiBaseUrl}/matriculas/mias`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })
    let respuesta = await consultarMatriculas()
    if (respuesta.status === 401) {
      await auth.restaurarSesion()
      if (!auth.accessToken) {
        matriculas.value = []
        return
      }
      respuesta = await consultarMatriculas()
    }
    if (!respuesta.ok) {
      error.value = respuesta.status === 501
        ? 'La consulta de matrículas todavía no está implementada en el servidor.'
        : 'No fue posible consultar tus matrículas.'
      return
    }

    const data: unknown = await respuesta.json()
    if (!Array.isArray(data) || !data.every(
      (matricula) => matricula
        && typeof matricula.id === 'number'
        && matricula.curso
        && typeof matricula.curso.nombre === 'string'
        && typeof matricula.curso.horario === 'string',
    )) {
      throw new Error('La respuesta de matrículas no tiene un formato válido.')
    }
    matriculas.value = data
  } catch {
    error.value = 'No fue posible consultar tus matrículas.'
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  void cargarHorario()
})

watch(() => auth.accessToken, (accessToken) => {
  if (!accessToken) {
    matriculas.value = []
    return
  }
  void cargarHorario()
})
</script>

<template>
  <main class="schedule-page">
    <RouterLink class="back-link" to="/inicio">← Volver al inicio</RouterLink>
    <header class="page-heading">
      <div>
        <p class="eyebrow">Proceso académico</p>
        <h1>Horario del estudiante</h1>
        <p>Calendario semanal de lunes a domingo, con las horas de cada asignatura matriculada.</p>
      </div>
    </header>

    <p v-if="cargando" class="loading-status" role="status">Consultando tus asignaturas matriculadas…</p>
    <section v-if="error" class="notice error" role="alert">
      <strong>No se pudo cargar el horario</strong>
      <p>{{ error }}</p>
    </section>
    <section class="calendar-section" aria-label="Calendario semanal de asignaturas">
      <p v-if="matriculas.length > 0" class="course-count">{{ matriculas.length }} asignaturas matriculadas</p>
      <p v-if="!cargando && !error && matriculas.length === 0" class="notice error empty-schedule" role="status">
        Aún no hay materias matriculadas.
      </p>
      <div class="calendar-scroll">
        <div class="week-grid">
          <div class="corner-cell">Hora</div>
          <div v-for="(dia, indice) in dias" :key="dia" class="day-heading" :style="{ gridColumn: String(indice + 2) }">
            {{ dia }}
          </div>

          <div
            v-for="(hora, indice) in horas"
            :key="hora"
            class="hour-label"
            :style="{ gridRow: String(indice + 2) }"
          >{{ hora }}</div>
          <div
            v-for="(dia, indice) in dias"
            :key="`column-${dia}`"
            class="day-column"
            :style="{ gridColumn: String(indice + 2) }"
            aria-hidden="true"
          ></div>
          <article
            v-for="bloque in bloques"
            :key="bloque.id"
            class="course-block"
            :style="{
              gridColumn: String(bloque.dia + 2),
              gridRow: `${bloque.fila} / span ${bloque.duracion}`,
            }"
              :aria-label="`${bloque.curso.nombre}, ${dias[bloque.dia]} de ${bloque.inicio} a ${bloque.fin}, docente ${bloque.curso.docente ?? 'Sin asignar'}`"
              :title="`${bloque.curso.nombre} · ${bloque.curso.docente ?? 'Sin asignar'} · ${dias[bloque.dia]} ${bloque.inicio}–${bloque.fin}`"
          >
            <strong>{{ bloque.curso.nombre }}</strong>
            <span>{{ bloque.curso.codigo }}</span>
            <span>{{ bloque.inicio }}–{{ bloque.fin }}</span>
            <span>{{ bloque.curso.docente ?? 'Sin asignar' }}</span>
          </article>
        </div>
      </div>
      <p v-if="bloques.length < matriculas.length" class="schedule-note">
        Algunas asignaturas no tienen un día y un intervalo horario reconocible; revisa sus datos de matrícula.
      </p>
    </section>
  </main>
</template>

<style scoped>
.schedule-page { max-width: 1440px; margin: 0 auto; padding: 30px clamp(16px, 4vw, 42px); color: #243a3c; }
.back-link { display: inline-block; margin-bottom: 20px; color: #176d85; font-size: 13px; text-decoration: none; }
.back-link:hover { text-decoration: underline; }
.page-heading { display: flex; align-items: end; justify-content: space-between; gap: 18px; margin-bottom: 22px; }
.eyebrow { margin: 0 0 7px; color: #1685a2; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
h1 { margin: 0; font-size: clamp(24px, 4vw, 32px); }
.page-heading p:last-child { color: #718083; font-size: 14px; line-height: 1.5; }
.notice { margin: 18px 0; padding: 20px; border: 1px solid #dce3e3; border-radius: 8px; background: #fff; }
.notice strong { color: #405458; font-size: 15px; }
.notice p { color: #718083; font-size: 13px; line-height: 1.6; }
.error { border-color: #e8c9c5; background: #fff8f7; }
.error strong, .error p { color: #8d3028; }
.empty-schedule { color: #8d3028; }
.loading-status { margin: 0 0 12px; color: #718083; font-size: 12px; }
.calendar-section { margin-top: 18px; padding: 18px; border: 1px solid #dce3e3; border-radius: 10px; background: #fff; box-shadow: 0 4px 14px rgb(36 58 60 / 6%); }
.course-count { margin: 0 0 10px; color: #536b6e; font-size: 12px; }
.calendar-scroll { overflow: auto; border: 1px solid #dce3e3; border-radius: 7px; background: #fff; }
.week-grid { --hour-height: 54px; display: grid; min-width: 920px; grid-template-columns: 68px repeat(7, minmax(115px, 1fr)); grid-template-rows: 42px repeat(24, var(--hour-height)); position: relative; }
.corner-cell, .day-heading { position: sticky; top: 0; z-index: 3; display: grid; place-items: center; border-right: 1px solid #e2e9e9; border-bottom: 1px solid #dce3e3; color: #536b6e; background: #f5f8f8; font-size: 11px; font-weight: 700; }
.corner-cell { left: 0; z-index: 4; grid-column: 1; grid-row: 1; }
.day-heading { grid-row: 1; }
.hour-label { position: sticky; left: 0; z-index: 2; display: flex; justify-content: center; padding-top: 5px; border-right: 1px solid #e2e9e9; border-bottom: 1px solid #e8eeee; color: #718083; background: #fbfcfc; font-size: 10px; font-variant-numeric: tabular-nums; }
.day-column { z-index: 0; grid-row: 2 / 26; border-right: 1px solid #e8eeee; background: repeating-linear-gradient(to bottom, #fff 0, #fff calc(var(--hour-height) - 1px), #e8eeee calc(var(--hour-height) - 1px), #e8eeee var(--hour-height)); }
.course-block { z-index: 1; min-width: 0; overflow: hidden; margin: 3px; padding: 7px; border: 1px solid #9bc8d0; border-left: 3px solid #176d85; border-radius: 5px; color: #24474e; background: #eaf6f7; font-size: 10px; line-height: 1.35; }
.course-block strong, .course-block span { display: block; overflow: hidden; text-overflow: ellipsis; }
.course-block strong { margin-bottom: 3px; font-size: 11px; }
.course-block span { margin-top: 2px; }
.schedule-note { margin: 12px 0 0; color: #8b641f; font-size: 12px; }
@media (max-width: 640px) { .page-heading { align-items: flex-start; flex-direction: column; } }
</style>
