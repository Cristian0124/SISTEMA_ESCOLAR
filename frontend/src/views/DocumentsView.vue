<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { isAxiosError } from 'axios'
import { consultarResumenMatricula, descargarResumenMatricula, type ResumenMatricula } from '@/api/documents.api'

const resumen = ref<ResumenMatricula | null>(null)
const cargando = ref(true)
const descargando = ref(false)
const error = ref('')

async function cargar() {
  cargando.value = true
  error.value = ''
  try { resumen.value = await consultarResumenMatricula() }
  catch { error.value = 'No fue posible consultar tu resumen de matrícula. Intenta nuevamente.' }
  finally { cargando.value = false }
}

async function descargar() {
  if (descargando.value || !resumen.value?.cursos.length) return
  descargando.value = true
  error.value = ''
  try {
    const archivo = await descargarResumenMatricula()
    const url = URL.createObjectURL(archivo)
    const revocarUrl = URL.revokeObjectURL.bind(URL)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = `resumen-matricula-${resumen.value.periodo}.pdf`
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    setTimeout(() => revocarUrl(url), 1000)
  } catch (fallo) {
    error.value = 'No fue posible descargar el PDF. Intenta nuevamente.'
    if (isAxiosError(fallo) && fallo.response?.status === 409) {
      await cargar()
      if (resumen.value?.cursos.length) error.value = 'La matrícula cambió. Vuelve a intentar la descarga.'
    }
  } finally { descargando.value = false }
}

onMounted(cargar)
</script>

<template>
  <main class="process-page">
    <RouterLink class="back-link" to="/inicio">← Volver al inicio</RouterLink>
    <header>
      <p class="eyebrow">Proceso de administración</p>
      <h1>Consulta de documentos</h1>
      <p>Consulta en un solo lugar los documentos asociados a tu actividad académica.</p>
    </header>
    <section class="notice" aria-live="polite">
      <h2>Resumen de matrícula</h2>
      <p>Resumen informativo generado por el sistema con tus cursos activos, horarios y créditos. No constituye una certificación oficial.</p>
      <p v-if="cargando" role="status">Consultando tu matrícula…</p>
      <template v-else-if="resumen">
        <p v-if="!resumen.cursos.length" role="status">No tienes matrículas activas en el periodo {{ resumen.periodo }}.</p>
        <template v-else>
          <p>Periodo {{ resumen.periodo }} · {{ resumen.cursos.length }} cursos activos · {{ resumen.totalCreditos }} créditos</p>
          <button :disabled="descargando" @click="descargar">{{ descargando ? 'Generando PDF…' : 'Descargar resumen en PDF' }}</button>
        </template>
      </template>
      <div v-if="error" role="alert" class="error">
        <p>{{ error }}</p>
        <button :disabled="cargando || descargando" @click="cargar">Volver a consultar</button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.process-page { max-width: 1000px; margin: 0 auto; padding: 30px clamp(16px, 4vw, 42px); color: #243a3c; }
.back-link { display: inline-block; margin-bottom: 20px; color: #176d85; font-size: 13px; text-decoration: none; }
.back-link:hover { text-decoration: underline; }
.eyebrow { margin: 0 0 7px; color: #1685a2; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
h1 { margin: 0; font-size: clamp(24px, 4vw, 32px); }
header > p:last-child { color: #718083; font-size: 14px; }
.notice { margin-top: 24px; padding: 22px; border: 1px solid #dce3e3; border-radius: 8px; background: #fff; }
.notice strong { color: #405458; font-size: 15px; }
.notice p { color: #718083; font-size: 13px; line-height: 1.6; }
.notice h2 { margin: 0; color: #405458; font-size: 17px; }
button { padding: 10px 16px; border: 1px solid #176d85; border-radius: 6px; background: #176d85; color: #fff; font: inherit; cursor: pointer; }
button:disabled { opacity: .55; cursor: wait; }
button:focus-visible { outline: 3px solid #d5a348; outline-offset: 3px; }
.error p { color: #8d3028; }
</style>
