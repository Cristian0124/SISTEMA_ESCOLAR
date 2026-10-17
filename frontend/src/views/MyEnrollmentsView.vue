<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { isAxiosError } from 'axios'
import api from '@/api/axios'
import type { Curso } from '@/api/courses.api'
// Contrato esperado para GET /matriculas/mias cuando se implemente el servidor.
interface Matricula { id: number; curso: Curso & { creditos?: number }; estado?: string; fecha?: string }
const matriculas = ref<Matricula[]>([])
const cargando = ref(false)
const error = ref('')
async function cargar() {
  if (cargando.value) return
  cargando.value = true; error.value = ''; matriculas.value = []
  try {
    const { data } = await api.get<Matricula[]>('/matriculas/mias')
    if (!Array.isArray(data) || !data.every(m => m && typeof m.id === 'number' && m.curso && typeof m.curso.nombre === 'string')) throw new Error('Respuesta inválida')
    matriculas.value = data
  } catch (e) {
    error.value = isAxiosError(e) && e.response?.status === 501
      ? 'La consulta de matrículas todavía no está implementada en el servidor. No es posible verificar tus matrículas en este momento.'
      : 'No fue posible consultar tus matrículas. Intenta nuevamente.'
  } finally { cargando.value = false }
}
onMounted(cargar)
</script>
<template>
  <main class="academic-page">
    <nav aria-label="Navegación académica"><RouterLink to="/home">Inicio</RouterLink><RouterLink to="/catalog">Catálogo</RouterLink><RouterLink to="/matricula">Seleccionar cursos</RouterLink></nav>
    <h1>Mis matrículas</h1><p class="intro">Consulta los cursos registrados para tu usuario.</p>
    <button :disabled="cargando" @click="cargar">Actualizar matrículas</button>
    <p v-if="cargando" role="status">Consultando tus matrículas…</p>
    <div v-else-if="error" class="notice error" role="alert">{{ error }} <button @click="cargar">Reintentar</button></div>
    <div v-else-if="!matriculas.length" class="notice"><p>Aún no tienes matrículas registradas.</p><RouterLink to="/matricula">Seleccionar cursos</RouterLink></div>
    <section v-else aria-label="Matrículas registradas">
      <p role="status">{{ matriculas.length }} matrículas registradas</p>
      <article v-for="matricula in matriculas" :key="matricula.id" class="enrollment">
        <h2>{{ matricula.curso.codigo }} — {{ matricula.curso.nombre }}</h2>
        <p>Docente: {{ matricula.curso.docente }}</p><p>Horario: {{ matricula.curso.horario }}</p>
        <p>Créditos: {{ matricula.curso.creditos ?? 'No informados' }}</p>
        <p>Estado: {{ matricula.estado ?? 'No informado' }}</p><p v-if="matricula.fecha">Fecha: {{ matricula.fecha }}</p>
      </article>
    </section>
  </main>
</template>

<style scoped>
.academic-page { max-width: 1120px; margin: auto; padding: 28px 18px; color: #243a3c; }
nav { display: flex; flex-wrap: wrap; gap: 18px; margin-bottom: 24px; } a { color: #176d85; }
h1 { margin-bottom: 8px; } .intro { color: #536b6e; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin: 20px 0; }
.choice, .summary, .notice, .enrollment { padding: 16px; border: 1px solid #dfe7e7; border-radius: 8px; background: #fff; margin: 16px 0; }
.choice { margin: 0; padding: 10px; } .choice label { display: flex; gap: 8px; padding: 12px 2px; align-items: center; }
button { padding: 10px 16px; border: 1px solid #176d85; border-radius: 6px; background: #176d85; color: white; cursor: pointer; margin: 5px; font: inherit; }
button:disabled { opacity: .55; cursor: not-allowed; } button:focus-visible, a:focus-visible { outline: 3px solid #d5a348; outline-offset: 3px; }
.error { color: #8d3028; background: #fff4f2; } .success { color: #246c4a; background: #eaf5ee; }
li { margin: 10px 0; } .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
</style>
