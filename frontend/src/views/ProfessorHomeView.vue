<script setup lang="ts">
import { accesosProfesor } from '@/layouts/navigation'
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { listarCursosAsignados } from '@/api/professorGrades.api'
import type { Curso } from '@/api/courses.api'

const auth = useAuthStore()
const cursosAsignados = ref<Curso[]>([])
const cargandoCursos = ref(false)
const errorCursos = ref('')

const accesosVisibles = accesosProfesor

async function cargarCursosAsignados(): Promise<void> {
  cargandoCursos.value = true
  errorCursos.value = ''
  try {
    cursosAsignados.value = await listarCursosAsignados()
  } catch {
    errorCursos.value = 'No fue posible consultar tus cursos asignados.'
  } finally {
    cargandoCursos.value = false
  }
}

onMounted(() => void cargarCursosAsignados())
</script>

<template>
  <main class="main-area">
    <div class="view-tab"><span aria-hidden="true">⌂</span> Inicio docente</div>
    <section class="welcome">
      <p class="eyebrow">ESPACIO DOCENTE</p>
      <h1>Bienvenido, {{ auth.usuario?.nombre ?? 'profesor' }}</h1>
      <p>Consulta tus cursos, sus estudiantes, registra notas y contacta a los administradores.</p>
    </section>

    <section class="courses-section" aria-labelledby="courses-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">MIS CURSOS</p>
          <h2 id="courses-title">Cursos asignados</h2>
        </div>
        <button class="refresh-button" type="button" :disabled="cargandoCursos" @click="cargarCursosAsignados">
          {{ cargandoCursos ? 'Actualizando…' : 'Actualizar' }}
        </button>
      </div>

      <p v-if="cargandoCursos && !cursosAsignados.length" class="courses-notice" role="status">Cargando tus cursos…</p>
      <div v-else-if="errorCursos" class="courses-notice courses-error" role="alert">
        <span>{{ errorCursos }}</span>
        <button class="retry-button" type="button" @click="cargarCursosAsignados">Intentar de nuevo</button>
      </div>
      <p v-else-if="!cursosAsignados.length" class="courses-notice" role="status">
        Aún no tienes cursos asignados. Contacta al administrador para que te asigne cursos.
      </p>
      <div v-else class="assigned-courses">
        <article v-for="curso in cursosAsignados" :key="curso.id" class="assigned-course">
          <div class="course-heading">
            <span class="course-code">{{ curso.codigo }}</span>
            <span v-if="curso.semestre" class="course-semester">Semestre {{ curso.semestre }}</span>
          </div>
          <h3>{{ curso.nombre }}</h3>
          <dl>
            <div><dt>Horario</dt><dd>{{ curso.horario }}</dd></div>
          </dl>
          <RouterLink class="course-action" to="/profesor/calificaciones">Consultar estudiantes y registrar notas <span aria-hidden="true">→</span></RouterLink>
        </article>
      </div>
    </section>

    <section class="access-section" aria-labelledby="access-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">ACCESOS</p>
          <h2 id="access-title">¿Qué necesitas consultar?</h2>
        </div>
        <span>{{ accesosVisibles.length }} procesos</span>
      </div>

      <div v-if="accesosVisibles.length" class="access-list">
        <RouterLink
          v-for="acceso in accesosVisibles"
          :key="acceso.ruta"
          class="access-row"
          :to="acceso.ruta"
        >
          <span class="access-icon" aria-hidden="true">{{ acceso.icono }}</span>
          <strong>{{ acceso.titulo }}</strong>
          <span class="access-description">{{ acceso.descripcion }}</span>
          <span class="access-action">Abrir <span aria-hidden="true">→</span></span>
        </RouterLink>
      </div>
      <p v-else class="empty-search">No hay accesos que coincidan con la búsqueda.</p>
    </section>
  </main>
</template>

<style scoped>
.access-row:hover { background: #f4f9f9; }

.empty-search { margin: 16px 12px; color: var(--muted); font-size: 12px; }

.main-area { min-width: 0; padding: 0 clamp(20px, 4vw, 52px) 44px; background: #fff; }

.view-tab { display: flex; align-items: center; gap: 8px; width: fit-content; min-height: 34px; margin-left: -16px; padding: 0 14px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); border-left: 1px solid var(--line); color: var(--accent); font-size: 11px; }

.welcome { max-width: 740px; padding: clamp(42px, 7vh, 78px) 0 45px; }

.eyebrow { margin: 0 0 9px; color: var(--accent); font-size: 10px; font-weight: 700; letter-spacing: .1em; }

h1 { margin: 0; font-size: clamp(27px, 4vw, 38px); font-weight: 600; }

.welcome > p:last-child { max-width: 590px; margin: 12px 0 0; color: var(--muted); font-size: 14px; line-height: 1.6; }

.courses-section { max-width: 980px; margin-bottom: 34px; border-top: 1px solid var(--line); }

.assigned-courses { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px; }

.assigned-course { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--line); background: #fff; }

.course-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; }

.course-code { color: var(--accent); font-size: 10px; font-weight: 700; letter-spacing: .08em; }

.course-semester { color: var(--muted); font-size: 10px; }

.assigned-course h3 { margin: 0; font-size: 15px; }

.assigned-course dl { display: grid; gap: 8px; margin: 0; }

.assigned-course dl div { display: flex; justify-content: space-between; gap: 10px; font-size: 11px; }

.assigned-course dt { color: var(--muted); }

.assigned-course dd { margin: 0; color: var(--ink); text-align: right; }

.course-action { display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid #e9eeee; color: var(--accent); font-size: 11px; font-weight: 700; text-decoration: none; }

.courses-notice { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin: 0; padding: 15px; border: 1px solid var(--line); color: var(--muted); background: #fff; font-size: 12px; }

.courses-error { border-color: #e8c9c5; color: #8d3028; background: #fff4f2; }

.refresh-button,
.retry-button { min-height: 32px; padding: 0 11px; border: 1px solid #cbdada; border-radius: 4px; color: var(--accent); background: #fff; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }

.refresh-button:disabled { opacity: .55; cursor: wait; }

.access-section { max-width: 980px; border-top: 1px solid var(--line); }

.section-heading { display: flex; align-items: end; justify-content: space-between; gap: 16px; padding: 22px 0 14px; }

.section-heading .eyebrow { margin-bottom: 5px; }

.section-heading h2 { margin: 0; font-size: 17px; font-weight: 600; }

.section-heading > span { color: var(--muted); font-size: 11px; }

.access-list { border: 1px solid var(--line); }

.access-row { display: grid; grid-template-columns: 36px minmax(0, .8fr) minmax(0, 1.4fr) 62px; align-items: center; gap: 12px; min-height: 68px; padding: 0 15px; border-bottom: 1px solid #e9eeee; color: var(--ink); text-decoration: none; overflow-wrap: anywhere; }

.access-row:last-child { border-bottom: 0; }

.access-icon { display: grid; width: 32px; height: 32px; place-items: center; border: 1px solid #d4e2e3; color: var(--accent); background: #f5f9f9; }

.access-row strong { font-size: 12px; }

.access-description { color: var(--muted); font-size: 12px; line-height: 1.45; }

.access-action { justify-self: end; color: var(--accent); font-size: 11px; font-weight: 700; }

@media (max-width: 760px) {
.main-area { padding-right: 16px; padding-left: 28px; }

.welcome { padding-top: 36px; }

.access-row { grid-template-columns: 38px minmax(0, 1fr) 62px; gap: 9px; padding: 10px; }

.access-description { grid-column: 2 / 3; }

.access-action { grid-column: 3; grid-row: 1 / 3; }
}
</style>
