<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listarCursosAsignados } from '@/api/professorGrades.api'
import type { Curso } from '@/api/courses.api'

const cursos = ref<Curso[]>([])
const cargando = ref(true)
const error = ref('')

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''
  try {
    cursos.value = await listarCursosAsignados()
  } catch {
    error.value = 'No fue posible consultar tu horario.'
  } finally {
    cargando.value = false
  }
}

onMounted(() => void cargar())
</script>

<template>
  <main class="schedule-page">
    <RouterLink class="back-link" to="/profesor/home">← Volver al espacio docente</RouterLink>
    <header>
      <p class="eyebrow">ESPACIO DOCENTE</p>
      <h1>Mi horario</h1>
      <p>Horario de los cursos que tienes asignados.</p>
    </header>

    <p v-if="cargando" class="notice" role="status">Consultando horario…</p>
    <div v-else-if="error" class="notice error" role="alert">
      <span>{{ error }}</span><button type="button" @click="cargar">Intentar de nuevo</button>
    </div>
    <p v-else-if="!cursos.length" class="notice">Aún no tienes cursos asignados.</p>
    <div v-else class="course-list">
      <article v-for="curso in cursos" :key="curso.id" class="course-row">
        <div><span class="code">{{ curso.codigo }}</span><h2>{{ curso.nombre }}</h2></div>
        <p><strong>Horario</strong>{{ curso.horario }}</p>
      </article>
    </div>
  </main>
</template>

<style scoped>
.schedule-page { width: min(900px, 100%); min-height: 100vh; margin: auto; padding: 32px clamp(16px, 4vw, 42px); color: #263d40; background: #fff; font-family: 'Trebuchet MS', 'Aptos', sans-serif; }
.back-link { color: #176d85; font-size: 12px; text-decoration: none; }
header { margin: 28px 0 24px; } .eyebrow, .code { color: #176d85; font-size: 10px; font-weight: 700; letter-spacing: .1em; }
h1 { margin: 0; font-size: 32px; } header > p:last-child { color: #728184; font-size: 14px; }
.course-list { display: grid; gap: 10px; } .course-row { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 16px; border: 1px solid #dce4e4; }
.course-row h2 { margin: 6px 0 0; font-size: 16px; } .course-row p { display: grid; gap: 5px; margin: 0; color: #263d40; text-align: right; font-size: 13px; } .course-row p strong { color: #728184; font-size: 11px; }
.notice { padding: 14px; border: 1px solid #dce4e4; color: #728184; font-size: 13px; } .error { display: flex; justify-content: space-between; gap: 12px; color: #8d3028; background: #fff4f2; } button { border: 1px solid #cbdada; padding: 6px 10px; color: #176d85; background: #fff; cursor: pointer; }
@media (max-width: 600px) { .course-row { align-items: flex-start; flex-direction: column; } .course-row p { text-align: left; } }
</style>
