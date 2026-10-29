<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { isAxiosError } from 'axios'
import api from '@/api/axios'
import type { Curso } from '@/api/courses.api'
import { useAuthStore } from '@/stores/auth'

interface Matricula {
  id: number
  usuarioId?: number
  nombreEstudiante?: string
  correoEstudiante?: string
  curso: Curso & { creditos?: number }
  estado?: string
  fecha?: string
  periodo?: string
}

const auth = useAuthStore()
const esAdmin = computed(() => auth.usuario?.rol === 'admin')
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
    const endpoint = esAdmin.value ? '/matriculas/admin/todas' : '/matriculas/mias'
    const { data } = await api.get<Matricula[]>(endpoint)
    if (!Array.isArray(data) || !data.every((matricula) =>
      matricula && typeof matricula.id === 'number' && matricula.curso && typeof matricula.curso.nombre === 'string'
    )) throw new Error('Respuesta inválida')
    matriculas.value = data
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
      <RouterLink :to="esAdmin ? '/admin/home' : '/inicio'">Inicio</RouterLink>
      <RouterLink to="/catalog">Catálogo</RouterLink>
      <RouterLink to="/matricula">Seleccionar cursos</RouterLink>
    </nav>
    <h1>{{ esAdmin ? 'Matrículas del periodo' : 'Mis matrículas' }}</h1>
    <p class="intro">{{ esAdmin ? 'Consulta los cursos matriculados por los estudiantes durante el periodo vigente.' : 'Consulta los cursos registrados para tu usuario en el periodo vigente.' }}</p>
    <button :disabled="cargando" @click="cargar">{{ cargando ? 'Actualizando…' : 'Actualizar matrículas' }}</button>
    <p v-if="cargando" role="status">Consultando matrículas…</p>
    <div v-else-if="error" class="notice error" role="alert">{{ error }} <button @click="cargar">Reintentar</button></div>
    <div v-else-if="!matriculas.length" class="notice">
      <p>{{ esAdmin ? 'No hay matrículas registradas en el periodo vigente.' : 'Aún no tienes matrículas registradas en el periodo vigente.' }}</p>
      <RouterLink v-if="!esAdmin" to="/matricula">Seleccionar cursos</RouterLink>
    </div>
    <section v-else aria-label="Matrículas registradas">
      <p role="status">{{ matriculas.length }} {{ esAdmin ? 'matrículas registradas' : 'cursos matriculados' }}</p>
      <article v-for="matricula in matriculas" :key="matricula.id" class="enrollment">
        <p v-if="esAdmin" class="student">Estudiante: <strong>{{ matricula.nombreEstudiante }}</strong><span v-if="matricula.correoEstudiante"> · {{ matricula.correoEstudiante }}</span></p>
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
.academic-page { max-width: 1120px; margin: auto; padding: 28px 18px; color: #243a3c; }
nav { display: flex; flex-wrap: wrap; gap: 18px; margin-bottom: 24px; }
a { color: #176d85; }
h1 { margin-bottom: 8px; }
.intro { color: #536b6e; }
.notice, .enrollment { padding: 16px; border: 1px solid #dfe7e7; border-radius: 8px; background: #fff; margin: 16px 0; }
.enrollment h2 { margin: 5px 0 12px; font-size: 19px; }
.enrollment p { margin: 7px 0; }
.student { color: #536b6e; }
button { padding: 10px 16px; border: 1px solid #176d85; border-radius: 6px; background: #176d85; color: white; cursor: pointer; margin: 5px; font: inherit; }
button:disabled { opacity: .55; cursor: not-allowed; }
button:focus-visible, a:focus-visible { outline: 3px solid #d5a348; outline-offset: 3px; }
.error { color: #8d3028; background: #fff4f2; }
</style>
