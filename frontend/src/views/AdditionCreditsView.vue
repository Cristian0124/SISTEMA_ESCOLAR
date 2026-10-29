<script setup lang="ts">
import { onMounted, ref } from 'vue'
import axios from 'axios'
import { obtenerMisCreditos, solicitarCreditos, type ResumenCreditos } from '@/api/credits.api'

const resumen = ref<ResumenCreditos | null>(null)
const cantidad = ref<number | undefined>()
const motivo = ref('')
const cargando = ref(true)
const enviando = ref(false)
const error = ref('')
const mensaje = ref('')
const tieneSolicitudPendiente = (resumen: ResumenCreditos) => resumen.solicitud?.estado === 'Pendiente' && resumen.solicitud.periodo === resumen.periodo

async function cargar() {
  cargando.value = true
  error.value = ''
  try { resumen.value = await obtenerMisCreditos() }
  catch (fallo) {
    error.value = axios.isAxiosError(fallo) ? fallo.response?.data?.mensaje ?? 'No fue posible consultar tus créditos.' : 'No fue posible consultar tus créditos.'
  } finally { cargando.value = false }
}

async function enviar() {
  if (!cantidad.value || motivo.value.trim().length < 10) return
  enviando.value = true; error.value = ''; mensaje.value = ''
  try {
    await solicitarCreditos(cantidad.value, motivo.value.trim())
    mensaje.value = 'Solicitud enviada. Un administrador debe aprobarla antes de que esos créditos estén disponibles.'
    cantidad.value = undefined; motivo.value = ''
    await cargar()
  } catch (fallo) {
    error.value = axios.isAxiosError(fallo) ? fallo.response?.data?.mensaje ?? 'No fue posible enviar la solicitud.' : 'No fue posible enviar la solicitud.'
  } finally { enviando.value = false }
}

onMounted(() => void cargar())
</script>

<template>
  <main class="page">
    <RouterLink class="back" to="/inicio">← Volver al inicio</RouterLink>
    <header><p class="eyebrow">Matrícula académica</p><h1>Adición de créditos</h1><p>Consulta tu cupo para matricular y solicita créditos adicionales si los necesitas.</p></header>
    <p v-if="cargando" class="notice" role="status">Consultando tu balance…</p>
    <div v-else-if="error && !resumen" class="notice error" role="alert">{{ error }} <button @click="cargar">Reintentar</button></div>
    <template v-else-if="resumen">
      <section class="balance" aria-label="Balance de créditos">
        <div class="available"><span>Disponibles para matricular</span><strong>{{ resumen.creditosDisponibles }}</strong><small>créditos · Periodo {{ resumen.periodo }}</small></div>
        <div><span>Semestre de referencia</span><strong>{{ resumen.semestre }}°</strong></div>
        <div><span>Cupo base</span><strong>{{ resumen.creditosBase }}</strong></div>
        <div><span>Ya matriculados</span><strong>{{ resumen.creditosMatriculados }}</strong></div>
        <div><span>Créditos extra aprobados</span><strong>{{ resumen.creditosExtra }}</strong></div>
      </section>
      <section v-if="resumen.solicitud" class="notice">
        <strong>Tu solicitud más reciente: {{ resumen.solicitud.estado }}</strong>
        <p>{{ resumen.solicitud.creditos }} créditos para el periodo {{ resumen.solicitud.periodo }}. {{ resumen.solicitud.motivo }}</p>
      </section>
      <form class="form" @submit.prevent="enviar">
        <h2>Solicitar créditos adicionales</h2>
        <p>La solicitud debe explicar por qué necesitas ampliar tu carga. Los créditos solo se suman al cupo después de la aprobación administrativa.</p>
        <label>Cantidad de créditos<input v-model.number="cantidad" type="number" min="1" :max="resumen.creditosPrograma" step="1" required /></label>
        <label>Motivo<textarea v-model.trim="motivo" minlength="10" maxlength="1000" rows="4" required placeholder="Explica para qué materias necesitas estos créditos"></textarea></label>
        <p v-if="error" class="error" role="alert">{{ error }}</p><p v-if="mensaje" class="success" role="status">{{ mensaje }}</p>
        <button type="submit" :disabled="enviando || tieneSolicitudPendiente(resumen) || !cantidad || motivo.trim().length < 10">{{ enviando ? 'Enviando…' : tieneSolicitudPendiente(resumen) ? 'Solicitud pendiente de revisión' : 'Enviar solicitud' }}</button>
      </form>
    </template>
  </main>
</template>

<style scoped>
.page { max-width: 950px; margin: 0 auto; padding: 30px clamp(16px, 4vw, 42px); color: #243a3c; }.back { color: #176d85; text-decoration: none; font-size: 13px; }.eyebrow { margin: 24px 0 7px; color: #1685a2; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }h1 { margin: 0; font-size: clamp(25px,4vw,34px); }header > p:last-child,.form > p { color: #718083; font-size: 14px; line-height: 1.6; }
.balance { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 12px; margin: 24px 0; }.balance > div,.form,.notice { padding: 18px; border: 1px solid #dce3e3; border-radius: 8px; background: #fff; }.balance > div { display: grid; gap: 7px; }.balance span,.balance small { color: #718083; font-size: 12px; }.balance strong { color: #176d85; font-size: 22px; }.balance .available { grid-column: span 4; background: #f1f8f8; }.available strong { font-size: 36px; }.form { display: grid; gap: 14px; }.form h2 { margin: 0; font-size: 19px; }.form > p { margin: 0; }label { display: grid; gap: 7px; font-size: 13px; font-weight: 700; }input,textarea { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cbd7d8; border-radius: 5px; font: inherit; }button { justify-self: start; padding: 10px 15px; border: 0; border-radius: 5px; color: white; background: #176d85; font: inherit; font-weight: 700; cursor: pointer; }button:disabled { opacity: .55; cursor: not-allowed; }.notice { margin: 16px 0; }.error { color: #8d3028; }.success { color: #246c4a; }
@media(max-width:650px){.balance{grid-template-columns:repeat(2,minmax(0,1fr))}.balance .available{grid-column:span 2}}
</style>
