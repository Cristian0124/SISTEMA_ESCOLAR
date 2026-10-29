<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import axios from 'axios'
import { listarSolicitudesSoporte, responderSolicitudSoporte } from '@/api/support.api'
import type { SolicitudSoporteAdmin } from '@/api/support.api'

const solicitudes = ref<SolicitudSoporteAdmin[]>([])
const respuestas = reactive<Record<number, string>>({})
const cargando = ref(false)
const enviandoId = ref<number | null>(null)
const error = ref('')
const exito = ref('')

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''
  try {
    solicitudes.value = await listarSolicitudesSoporte()
  } catch {
    error.value = 'No fue posible consultar los mensajes de soporte.'
  } finally {
    cargando.value = false
  }
}

async function responder(solicitud: SolicitudSoporteAdmin): Promise<void> {
  enviandoId.value = solicitud.id
  error.value = ''
  exito.value = ''
  try {
    await responderSolicitudSoporte(solicitud.id, respuestas[solicitud.id] ?? '')
    exito.value = `Respuesta enviada a ${solicitud.nombreProfesor}.`
    delete respuestas[solicitud.id]
    await cargar()
  } catch (fallo) {
    error.value = axios.isAxiosError(fallo)
      ? fallo.response?.data?.mensaje ?? 'No fue posible enviar la respuesta.'
      : 'No fue posible enviar la respuesta.'
  } finally {
    enviandoId.value = null
  }
}

function fecha(valor: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor))
}

onMounted(() => void cargar())
</script>

<template>
  <main class="support-admin">
    <RouterLink class="back-link" to="/admin/home">← Volver al panel</RouterLink>
    <header><p class="eyebrow">ADMINISTRACIÓN</p><h1>Soporte docente</h1><p>Consultas enviadas por los profesores.</p></header>
    <p v-if="error" class="error" role="alert">{{ error }}</p><p v-if="exito" class="success" role="status">{{ exito }}</p>
    <p v-if="cargando" role="status">Cargando consultas…</p>
    <p v-else-if="!solicitudes.length">No hay consultas de profesores.</p>
    <section v-else class="ticket-list">
      <article v-for="solicitud in solicitudes" :key="solicitud.id" class="ticket">
        <div class="ticket-heading"><div><h2>{{ solicitud.nombreProfesor }}</h2><a :href="`mailto:${solicitud.correoProfesor}`">{{ solicitud.correoProfesor }}</a></div><span>{{ fecha(solicitud.creadoEn) }}</span></div>
        <div class="message"><strong>Consulta</strong><p>{{ solicitud.mensaje }}</p></div>
        <div v-if="solicitud.respuesta" class="reply"><strong>Respuesta enviada</strong><p>{{ solicitud.respuesta }}</p></div>
        <form v-else class="reply-form" @submit.prevent="responder(solicitud)">
          <label :for="`respuesta-${solicitud.id}`">Responder</label>
          <textarea :id="`respuesta-${solicitud.id}`" v-model="respuestas[solicitud.id]" required minlength="5" maxlength="2000" rows="3"></textarea>
          <button type="submit" :disabled="enviandoId !== null || (respuestas[solicitud.id] ?? '').trim().length < 5">{{ enviandoId === solicitud.id ? 'Enviando…' : 'Enviar respuesta' }}</button>
        </form>
      </article>
    </section>
    <button class="refresh" type="button" :disabled="cargando" @click="cargar">Actualizar consultas</button>
  </main>
</template>

<style scoped>
.support-admin { width: min(1000px, 100%); min-height: 100vh; margin: auto; padding: 30px clamp(16px, 4vw, 40px); color: #34464d; background: #fff; font-family: Arial, sans-serif; }.back-link { color: #356f87; font-size: 12px; text-decoration: none; }header { margin: 28px 0; }.eyebrow { color: #356f87; font-size: 10px; font-weight: 700; letter-spacing: .1em; }h1 { margin: 0; font-size: 30px; }header > p:last-child { color: #758187; font-size: 13px; }.ticket-list { display: grid; gap: 14px; }.ticket { display: grid; gap: 12px; padding: 18px; border: 1px solid #cfd8dc; }.ticket-heading { display: flex; justify-content: space-between; gap: 14px; }.ticket-heading h2 { margin: 0 0 5px; font-size: 16px; }.ticket-heading a, .ticket-heading > span { color: #758187; font-size: 11px; }.message, .reply { padding: 12px; background: #f5f7f8; font-size: 12px; }.reply { background: #edf6f0; }.message p, .reply p { margin: 6px 0 0; line-height: 1.5; }.reply-form { display: grid; gap: 8px; }.reply-form label { font-size: 12px; font-weight: 700; }textarea { resize: vertical; padding: 9px; border: 1px solid #cbd7d8; border-radius: 4px; font: inherit; font-size: 13px; }button { justify-self: start; min-height: 36px; padding: 0 12px; border: 1px solid #356f87; border-radius: 4px; color: white; background: #356f87; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }button:disabled { opacity: .55; cursor: wait; }.refresh { margin-top: 16px; color: #356f87; background: #fff; }.error { color: #8d3028; }.success { color: #246c4a; }
</style>
