<script setup lang="ts">
import { onMounted, ref } from 'vue'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import AvisoPagina from '@/components/ui/AvisoPagina.vue'
import axios from 'axios'
import { listarMisCalificaciones, type CalificacionMateriaMatriculada } from '@/api/calificaciones-estudiante.api'

const calificaciones = ref<CalificacionMateriaMatriculada[]>([])
const cargando = ref(true)
const error = ref('')

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    calificaciones.value = await listarMisCalificaciones()
  } catch (fallo) {
    error.value = axios.isAxiosError(fallo)
      ? fallo.response?.data?.mensaje ?? 'No fue posible consultar tus calificaciones.'
      : 'No fue posible consultar tus calificaciones.'
  } finally {
    cargando.value = false
  }
}

function formato(nota: number | null, decimales = 1) {
  return nota === null ? 'Pendiente' : nota.toFixed(decimales)
}

onMounted(() => void cargar())
</script>

<template>
  <main class="process-page">
    <EncabezadoPagina titulo="Notas registradas" seccion="Proceso académico"
      descripcion="Consulta las calificaciones de tus materias matriculadas. La nota final se calcula con los cortes 30%, 30% y 40%." />
    <p v-if="cargando" class="notice" role="status">Consultando tus calificaciones…</p>
    <AvisoPagina v-else-if="error" variante="error" titulo="No se pudieron cargar las notas"
      :mensaje="error" reintentar @reintentar="cargar" />
    <AvisoPagina v-else-if="!calificaciones.length" titulo="No tienes materias matriculadas"
      mensaje="Cuando tengas una matrícula activa, tus materias aparecerán aquí." />
    <section v-else class="grades-list" aria-label="Calificaciones por materia">
      <article v-for="materia in calificaciones" :key="materia.matriculaId" class="grade-card">
        <header class="subject-heading">
          <div><p class="eyebrow">{{ materia.codigoMateria }} · Semestre {{ materia.semestre }}</p><h2>{{ materia.nombreMateria }}</h2><p>{{ materia.cursoCodigo }} · {{ materia.horario }}</p></div>
          <div class="final"><span>Nota final</span><strong>{{ formato(materia.nota, 2) }}</strong></div>
        </header>
        <div class="cuts">
          <div><span>Corte 1 · 30%</span><strong>{{ formato(materia.corte1) }}</strong></div>
          <div><span>Corte 2 · 30%</span><strong>{{ formato(materia.corte2) }}</strong></div>
          <div><span>Corte 3 · 40%</span><strong>{{ formato(materia.corte3) }}</strong></div>
        </div>
        <p v-if="materia.nota !== null && materia.corte1 === null && materia.corte2 === null && materia.corte3 === null" class="historical">Esta nota fue registrada antes de habilitar los tres cortes; se conserva como nota final.</p>
      </article>
    </section>
  </main>
</template>

<style scoped>
.process-page { max-width: 1000px; margin: 0 auto; padding: 30px clamp(16px, 4vw, 42px); color: var(--school-ink); }
.eyebrow { margin: 0 0 7px; color: #9466a0; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.notice, .grade-card { margin-top: 20px; padding: 22px; border: 1px solid var(--school-border); border-radius: 8px; background: #fff; }
.notice p, .subject-heading p, .historical { color: var(--school-muted); font-size: 13px; line-height: 1.6; }
.grades-list { display: grid; gap: 16px; }.grade-card { margin: 0; }
.subject-heading { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }.subject-heading h2 { margin: 0; font-size: 20px; }.subject-heading p:last-child { margin-bottom: 0; }
.final { display: grid; gap: 5px; min-width: 115px; text-align: right; color: var(--school-muted); font-size: 12px; }.final strong { color: var(--school-blue); font-size: 24px; }
.cuts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }.cuts > div { display: grid; gap: 7px; padding: 14px; border-radius: 6px; background: #f4f8f8; }.cuts span { color: var(--school-muted); font-size: 12px; }.cuts strong { font-size: 18px; }
@media (max-width: 560px) { .subject-heading { flex-direction: column; }.final { text-align: left; }.cuts { gap: 6px; }.cuts > div { padding: 10px 8px; }.cuts span { font-size: 10px; }.cuts strong { font-size: 15px; } }
</style>
