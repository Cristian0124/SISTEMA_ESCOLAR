<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import {
  listarCursosAsignados,
  listarEstudiantesDelCurso,
  registrarNota,
  type EstudianteDeCurso,
} from '@/api/professorGrades.api'
import type { Curso } from '@/api/courses.api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const cursos = ref<Curso[]>([])
const cursoId = ref<number | null>(null)
const estudiantes = ref<EstudianteDeCurso[]>([])
const notas = ref<Record<number, { corte1?: number; corte2?: number; corte3?: number }>>({})
const cursoSeleccionado = computed(() => cursos.value.find((curso) => curso.id === cursoId.value) ?? null)
const cargandoCursos = ref(false)
const cargandoEstudiantes = ref(false)
const guardandoEstudianteId = ref<number | null>(null)
const error = ref('')
const resultados = ref<Record<number, string>>({})

async function cargarCursos() {
  cargandoCursos.value = true
  error.value = ''
  try {
    cursos.value = await listarCursosAsignados()
  } catch {
    error.value = 'No fue posible cargar los cursos que tienes asignados.'
  } finally {
    cargandoCursos.value = false
  }
}

onMounted(() => void cargarCursos())

async function cargarEstudiantes() {
  estudiantes.value = []
  notas.value = {}
  resultados.value = {}
  error.value = ''
  if (cursoId.value === null) return

  cargandoEstudiantes.value = true
  try {
    estudiantes.value = await listarEstudiantesDelCurso(cursoId.value)
    notas.value = Object.fromEntries(estudiantes.value.map((estudiante) => [estudiante.id, {
      corte1: estudiante.corte1 ?? undefined,
      corte2: estudiante.corte2 ?? undefined,
      corte3: estudiante.corte3 ?? undefined,
    }]))
  } catch (fallo) {
    error.value = axios.isAxiosError(fallo)
      ? fallo.response?.data?.mensaje ?? 'No fue posible consultar los estudiantes de este curso.'
      : 'No fue posible consultar los estudiantes de este curso.'
  } finally {
    cargandoEstudiantes.value = false
  }
}

async function guardarCalificacion(estudiante: EstudianteDeCurso) {
  const cortes = notas.value[estudiante.id]
  const curso = cursoSeleccionado.value
  if (!curso || !cortes || typeof cortes.corte1 !== 'number' || typeof cortes.corte2 !== 'number' || typeof cortes.corte3 !== 'number') return

  guardandoEstudianteId.value = estudiante.id
  error.value = ''
  resultados.value[estudiante.id] = ''
  try {
    const resultado = await registrarNota(estudiante.id, curso.codigoPensum, {
      corte1: cortes.corte1,
      corte2: cortes.corte2,
      corte3: cortes.corte3,
    })
    estudiante.corte1 = cortes.corte1
    estudiante.corte2 = cortes.corte2
    estudiante.corte3 = cortes.corte3
    estudiante.nota = resultado.nota
    resultados.value[estudiante.id] = `Nota final: ${resultado.nota.toFixed(2)}.`
  } catch (fallo) {
    error.value = axios.isAxiosError(fallo)
      ? fallo.response?.data?.mensaje ?? 'No fue posible guardar la calificación.'
      : 'No fue posible guardar la calificación.'
  } finally {
    guardandoEstudianteId.value = null
  }
}

async function salir() {
  await auth.cerrarSesion()
  await router.push('/login')
}
</script>

<template>
  <div class="grades-shell">
    <header class="topbar">
      <RouterLink class="brand" to="/profesor/home">Sistema académico</RouterLink>
      <div class="topbar-user">
        <span class="role-label">Profesor</span>
        <span class="user-name">{{ auth.usuario?.nombre }}</span>
        <button class="logout-button" type="button" @click="salir"><span aria-hidden="true">⏻</span> Salir</button>
      </div>
    </header>

    <main class="grades-page">
      <RouterLink class="back-link" to="/profesor/home">← Volver al inicio docente</RouterLink>
      <header class="page-heading">
        <p class="eyebrow">ESPACIO DOCENTE</p>
        <h1>Estudiantes y registro de notas</h1>
        <p>Consulta la información básica de los estudiantes matriculados en tus cursos y registra sus calificaciones.</p>
      </header>

      <section class="grade-form" aria-label="Formulario de calificación">
        <p v-if="cargandoCursos" class="notice" role="status">Consultando tus cursos…</p>
        <p v-else-if="error && !cursoId" class="notice error" role="alert">{{ error }}</p>
      <p v-else-if="!cursos.length" class="notice">No tienes cursos asignados. Verifica con el administrador que te haya asignado un curso.</p>
        <template v-else>
          <label for="curso">Curso asignado</label>
          <select id="curso" v-model.number="cursoId" @change="cargarEstudiantes">
            <option :value="null" disabled>Selecciona uno de tus cursos</option>
            <option v-for="curso in cursos" :key="curso.id" :value="curso.id">
              {{ curso.codigo }} · {{ curso.nombre }} · {{ curso.horario }}
            </option>
          </select>

          <p v-if="error" class="notice error" role="alert">{{ error }}</p>
          <p v-if="cargandoEstudiantes" class="notice" role="status">Consultando estudiantes matriculados…</p>
          <p v-else-if="cursoId !== null && estudiantes.length === 0 && !error" class="notice">Aún no hay estudiantes matriculados en este curso.</p>

          <section v-if="estudiantes.length" class="student-list" aria-label="Estudiantes matriculados">
            <div class="student-list-header"><span>Estudiante</span><span>Final</span><span>Corte 1 · 30%</span><span>Corte 2 · 30%</span><span>Corte 3 · 40%</span><span></span></div>
            <div v-for="estudiante in estudiantes" :key="estudiante.id" class="student-row">
              <div class="student-name"><strong>{{ estudiante.nombre }}</strong><span>Cédula {{ estudiante.cedula }}</span></div>
              <span class="current-grade">{{ estudiante.nota === null ? '—' : estudiante.nota.toFixed(2) }}</span>
              <input
                v-model.number="notas[estudiante.id].corte1"
                class="grade-input"
                type="number"
                min="0"
                max="5"
                step="0.1"
                :aria-label="`Corte 1 para ${estudiante.nombre}`"
              />
              <input
                v-model.number="notas[estudiante.id].corte2"
                class="grade-input"
                type="number"
                min="0"
                max="5"
                step="0.1"
                :aria-label="`Corte 2 para ${estudiante.nombre}`"
              />
              <input
                v-model.number="notas[estudiante.id].corte3"
                class="grade-input"
                type="number"
                min="0"
                max="5"
                step="0.1"
                :aria-label="`Corte 3 para ${estudiante.nombre}`"
              />
              <button
                class="primary-button"
                type="button"
                :disabled="guardandoEstudianteId !== null || !notas[estudiante.id] || notas[estudiante.id].corte1 === undefined || notas[estudiante.id].corte2 === undefined || notas[estudiante.id].corte3 === undefined"
                @click="guardarCalificacion(estudiante)"
              >{{ guardandoEstudianteId === estudiante.id ? 'Guardando…' : 'Guardar' }}</button>
              <span v-if="resultados[estudiante.id]" class="row-result" role="status">{{ resultados[estudiante.id] }}</span>
            </div>
          </section>
          <p class="grade-hint">Cada corte se califica de 0.0 a 5.0. La nota final se calcula: corte 1 × 30% + corte 2 × 30% + corte 3 × 40%. Una nota final de 3.0 o más aprueba la materia.</p>
        </template>
      </section>
    </main>

    <footer class="statusbar">
      <span>© 2026 Sistema académico</span>
      <span>Registro docente de calificaciones</span>
      <span class="connection"><i aria-hidden="true"></i> Sesión activa</span>
    </footer>
  </div>
</template>

<style scoped>
.grades-shell { --ink: #263d40; --muted: #728184; --line: #dce4e4; --accent: #176d85; display: grid; grid-template-rows: 54px minmax(0, 1fr) 34px; min-height: 100vh; color: var(--ink); background: #f5f7f6; font-family: 'Trebuchet MS', 'Aptos', sans-serif; }
.topbar, .topbar-user, .logout-button { display: flex; align-items: center; }
.topbar { justify-content: space-between; gap: 16px; padding: 0 18px; border-top: 4px solid #25454a; border-bottom: 1px solid var(--line); background: #fff; }
.brand { color: var(--ink); font-family: Georgia, 'Times New Roman', serif; font-size: 16px; text-decoration: none; }
.topbar-user { gap: 13px; min-width: 0; color: #53686b; font-size: 12px; }
.role-label { padding: 5px 8px; border: 1px solid #cfe0e2; border-radius: 3px; color: var(--accent); background: #f2f8f8; font-weight: 700; }
.user-name { overflow: hidden; max-width: 220px; color: var(--ink); font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.logout-button { gap: 6px; min-height: 32px; padding: 0 0 0 12px; border: 0; border-left: 1px solid var(--line); color: #9d453c; background: transparent; font: inherit; cursor: pointer; }
.grades-page { width: min(900px, 100%); margin: 0 auto; padding: 28px clamp(16px, 4vw, 42px) 56px; }
.back-link { color: var(--accent); font-size: 12px; text-decoration: none; }
.page-heading { margin: 26px 0 22px; }
.eyebrow { margin: 0 0 8px; color: var(--accent); font-size: 10px; font-weight: 700; letter-spacing: .1em; }
h1 { margin: 0; font-size: clamp(25px, 4vw, 34px); }
.page-heading > p:last-child { color: var(--muted); font-size: 14px; }
.grade-form { display: grid; gap: 22px; padding: clamp(18px, 4vw, 28px); border: 1px solid var(--line); background: #fff; }
.grade-fields { display: grid; gap: 9px; }
label { color: #405458; font-size: 12px; font-weight: 700; }
input, select { width: 100%; min-height: 42px; padding: 8px 11px; border: 1px solid #cbd7d8; border-radius: 4px; color: var(--ink); background: #fff; font: inherit; }
input:focus, select:focus { outline: 2px solid #1685a244; border-color: var(--accent); }
.student-list { border: 1px solid var(--line); }
.student-list-header, .student-row { display: grid; grid-template-columns: minmax(160px, 1.5fr) 65px repeat(3, minmax(85px, 1fr)) 90px; align-items: center; gap: 9px; padding: 11px 12px; }
.student-list-header { color: var(--muted); background: #f5f8f8; font-size: 10px; font-weight: 700; }
.student-row { border-top: 1px solid var(--line); }
.student-name { display: grid; gap: 4px; min-width: 0; }
.student-name strong { overflow-wrap: anywhere; font-size: 12px; }
.student-name span, .current-grade { color: var(--muted); font-size: 11px; }
.grade-input { min-height: 36px; padding: 5px 8px; }
.primary-button { justify-self: start; }
.row-result { grid-column: 1 / -1; color: #246c4a; font-size: 11px; }
.grade-hint { margin: 0; color: var(--muted); font-size: 11px; line-height: 1.5; }
.notice { margin: 0; padding: 11px 12px; font-size: 12px; line-height: 1.5; }
.success { color: #246c4a; background: #eaf5ee; }.error { color: #8d3028; background: #fff4f2; }
.primary-button, .secondary-button { min-height: 40px; padding: 0 16px; border: 1px solid var(--accent); border-radius: 4px; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
.primary-button { justify-self: start; color: #fff; background: var(--accent); }.secondary-button { color: var(--accent); background: #fff; }
button:disabled { opacity: .55; cursor: not-allowed; }
.statusbar { display: flex; align-items: center; gap: 14px; padding: 0 12px; border-top: 1px solid var(--line); color: #637477; background: #f8faf9; font-size: 10px; }
.connection { display: flex; align-items: center; gap: 5px; margin-left: auto; }.connection i { width: 7px; height: 7px; border-radius: 50%; background: #4d9a72; }
@media (max-width: 820px) { .topbar { padding: 0 12px; }.user-name { display: none; }.student-list-header { display: none; }.student-row { grid-template-columns: minmax(0, 1fr) 65px repeat(3, minmax(60px, 1fr)); gap: 8px; padding: 10px; }.student-row .primary-button { grid-column: 1 / -1; }.student-row .row-result { grid-column: 1 / -1; }.statusbar { gap: 8px; font-size: 9px; } }
</style>
