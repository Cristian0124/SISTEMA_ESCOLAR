<script setup lang="ts">
import { onMounted, ref } from 'vue'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import { isAxiosError } from 'axios'
import { consultarResumenMatricula, descargarResumenMatricula, type ResumenMatricula } from '@/api/documentos.api'

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
    <EncabezadoPagina titulo="Consulta de documentos" seccion="Proceso de administración"
      descripcion="Consulta en un solo lugar los documentos asociados a tu actividad académica." />
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
.process-page { max-width: 1000px; margin: 0 auto; padding: 30px clamp(16px, 4vw, 42px); color: var(--school-ink); }
.notice { margin-top: 24px; padding: 22px; border: 1px solid var(--school-border); border-radius: 8px; background: #fff; }
.notice strong { color: #493550; font-size: 15px; }
.notice p { color: var(--school-muted); font-size: 13px; line-height: 1.6; }
.notice h2 { margin: 0; color: #493550; font-size: 17px; }
button { padding: 10px 16px; border: 1px solid var(--school-blue); border-radius: 6px; background: var(--school-blue); color: #fff; font: inherit; cursor: pointer; }
button:disabled { opacity: .55; cursor: wait; }
button:focus-visible { outline: 3px solid #d5a348; outline-offset: 3px; }
.error p { color: #8d3028; }
</style>
