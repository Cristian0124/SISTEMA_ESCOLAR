<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { isAxiosError } from 'axios'
import { listarTodasLasMatriculas, type Matricula } from '@/api/matriculas.api'
import { useAutenticacionStore } from '@/stores/autenticacion.store'

const auth = useAutenticacionStore()
const matriculas = ref<Matricula[]>([])
const cargando = ref(false)
const error = ref('')

async function cargar() {
  if (cargando.value) return
  cargando.value = true
  error.value = ''
  matriculas.value = []
  try {
    if (!auth.accessToken) await auth.restaurarSesion()
    matriculas.value = await listarTodasLasMatriculas()
  } catch (fallo) {
    error.value = isAxiosError(fallo)
      ? fallo.response?.data?.mensaje ?? 'No fue posible consultar las matrículas. Intenta nuevamente.'
      : 'No fue posible consultar las matrículas. Intenta nuevamente.'
  } finally {
    cargando.value = false
  }
}

onMounted(() => void cargar())
</script>

<template>
  <main class="academic-page">
    <nav aria-label="Navegación académica">
      <RouterLink to="/admin/home">Volver a administración</RouterLink>
    </nav>
    <h1>Matrículas del periodo</h1>
    <p class="intro">Consulta los cursos matriculados por los estudiantes durante el periodo vigente.</p>
    <button :disabled="cargando" @click="cargar">{{ cargando ? 'Actualizando…' : 'Actualizar matrículas' }}</button>
    <p v-if="cargando" role="status">Consultando matrículas…</p>
    <div v-else-if="error" class="notice error" role="alert">{{ error }} <button @click="cargar">Reintentar</button></div>
    <div v-else-if="!matriculas.length" class="notice">
      <p>No hay matrículas registradas en el periodo vigente.</p>
    </div>
    <section v-else aria-label="Matrículas registradas">
      <p role="status">{{ matriculas.length }} matrículas registradas</p>
      <article v-for="matricula in matriculas" :key="matricula.id" class="enrollment">
        <p class="student">Estudiante: <strong>{{ matricula.nombreEstudiante }}</strong><span v-if="matricula.correoEstudiante"> · {{ matricula.correoEstudiante }}</span></p>
        <h2>{{ matricula.curso.codigo }} — {{ matricula.curso.nombre }}</h2>
        <p>Docente: {{ matricula.curso.docente ?? 'Sin asignar' }}</p>
        <p>Horario: {{ matricula.curso.horario }}</p>
        <p>Créditos: {{ matricula.curso.creditos ?? 'No informados' }}</p>
        <p>Estado: {{ matricula.estado ?? 'No informado' }}</p>
        <p v-if="matricula.periodo">Periodo: {{ matricula.periodo }}</p>
        <p v-if="matricula.fecha">Fecha: {{ new Date(matricula.fecha).toLocaleDateString() }}</p>
      </article>
    </section>
  </main>
</template>

<style scoped>
.academic-page { max-width: 1120px; margin: auto; padding: 28px 18px; color: var(--school-ink); }
nav { display: flex; flex-wrap: wrap; gap: 18px; margin-bottom: 24px; }
a { color: var(--school-blue); }
h1 { margin-bottom: 8px; }
.intro { color: var(--school-muted); }
.notice, .enrollment { padding: 16px; border: 1px solid var(--school-border); border-radius: 8px; background: #fff; margin: 16px 0; }
.enrollment h2 { margin: 5px 0 12px; font-size: 19px; }
.enrollment p { margin: 7px 0; }
.student { color: var(--school-muted); }
button { padding: 10px 16px; border: 1px solid var(--school-blue); border-radius: 6px; background: var(--school-blue); color: white; cursor: pointer; margin: 5px; font: inherit; }
button:disabled { opacity: .55; cursor: not-allowed; }
button:focus-visible, a:focus-visible { outline: 3px solid #d5a348; outline-offset: 3px; }
.error { color: #8d3028; background: #fff4f2; }
</style>
