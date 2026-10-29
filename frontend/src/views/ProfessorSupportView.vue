<script setup lang="ts">
import { onMounted, ref } from 'vue'
import axios from 'axios'
import { enviarSolicitudSoporte, listarMisSolicitudesSoporte } from '@/api/support.api'
import type { SolicitudSoporte } from '@/api/support.api'

const mensaje = ref('')
const solicitudes = ref<SolicitudSoporte[]>([])
const cargando = ref(false)
const enviando = ref(false)
const error = ref('')
const exito = ref('')

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''
  try {
    solicitudes.value = await listarMisSolicitudesSoporte()
  } catch {
    error.value = 'No fue posible cargar tus mensajes a soporte.'
  } finally {
    cargando.value = false
  }
}

async function enviar(): Promise<void> {
  enviando.value = true
  error.value = ''
  exito.value = ''
  try {
    await enviarSolicitudSoporte(mensaje.value)
    mensaje.value = ''
    exito.value = 'Tu mensaje fue enviado a los administradores.'
    await cargar()
  } catch (fallo) {
    error.value = axios.isAxiosError(fallo)
      ? fallo.response?.data?.mensaje ?? 'No fue posible enviar el mensaje.'
      : 'No fue posible enviar el mensaje.'
  } finally {
    enviando.value = false
  }
}

function fecha(valor: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor))
}

onMounted(() => void cargar())
</script>

<template>
  <main class="support-page">
    <RouterLink class="back-link" to="/profesor/home">← Volver al espacio docente</RouterLink>
    <header>
      <p class="eyebrow">ESPACIO DOCENTE</p>
      <h1>Soporte administrativo</h1>
      <p>Envía una consulta a los administradores y revisa sus respuestas aquí.</p>
    </header>

    <form class="message-form" @submit.prevent="enviar">
      <label for="mensaje">Mensaje para soporte</label>
      <textarea id="mensaje" v-model="mensaje" required minlength="5" maxlength="2000" rows="5" placeholder="Describe en qué necesitas ayuda…"></textarea>
      <div class="form-footer"><span>{{ mensaje.trim().length }}/2000</span><button type="submit" :disabled="enviando || mensaje.trim().length < 5">{{ enviando ? 'Enviando…' : 'Enviar mensaje' }}</button></div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="exito" class="success" role="status">{{ exito }}</p>
    </form>

    <section class="history" aria-labelledby="history-title">
      <div class="history-heading"><h2 id="history-title">Mis consultas</h2><button type="button" :disabled="cargando" @click="cargar">Actualizar</button></div>
      <p v-if="cargando" role="status">Cargando mensajes…</p>
      <p v-else-if="!solicitudes.length">Aún no has enviado consultas.</p>
      <article v-for="solicitud in solicitudes" v-else :key="solicitud.id" class="conversation">
        <div class="message"><small>Enviado {{ fecha(solicitud.creadoEn) }}</small><p>{{ solicitud.mensaje }}</p></div>
        <div v-if="solicitud.respuesta" class="reply"><small>Respuesta administrativa · {{ solicitud.respondidoEn ? fecha(solicitud.respondidoEn) : '' }}</small><p>{{ solicitud.respuesta }}</p></div>
        <p v-else class="pending">Pendiente de respuesta</p>
      </article>
    </section>
  </main>
</template>

<style scoped>
.support-page { width: min(900px, 100%); min-height: 100vh; margin: auto; padding: 32px clamp(16px, 4vw, 42px); color: #263d40; background: #fff; font-family: 'Trebuchet MS', 'Aptos', sans-serif; }
.back-link { color: #176d85; font-size: 12px; text-decoration: none; } header { margin: 28px 0 24px; } .eyebrow { color: #176d85; font-size: 10px; font-weight: 700; letter-spacing: .1em; } h1 { margin: 0; font-size: 30px; } header > p:last-child, .history > p { color: #728184; font-size: 13px; }
.message-form, .history { display: grid; gap: 12px; padding: 18px; border: 1px solid #dce4e4; } label { font-size: 12px; font-weight: 700; } textarea { resize: vertical; padding: 10px; border: 1px solid #cbd7d8; border-radius: 4px; font: inherit; font-size: 13px; } .form-footer, .history-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; } .form-footer span { color: #728184; font-size: 11px; }
button { min-height: 36px; padding: 0 12px; border: 1px solid #176d85; border-radius: 4px; color: #176d85; background: #fff; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; } button:disabled { opacity: .55; cursor: wait; } .form-footer button { color: #fff; background: #176d85; }
.error, .success, .pending { margin: 0; font-size: 12px; } .error { color: #8d3028; }.success { color: #246c4a; } .history { margin-top: 22px; }.history-heading h2 { margin: 0; font-size: 17px; } .conversation { display: grid; gap: 9px; padding: 12px 0; border-top: 1px solid #e9eeee; }.message, .reply { padding: 10px 12px; background: #f5f8f8; }.reply { background: #edf6f0; }small, .pending { color: #728184; font-size: 11px; } .message p, .reply p { margin: 6px 0 0; font-size: 13px; line-height: 1.5; }
</style>
