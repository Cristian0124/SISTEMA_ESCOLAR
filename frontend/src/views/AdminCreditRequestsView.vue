<script setup lang="ts">
import { onMounted, ref } from 'vue'
import axios from 'axios'
import { listarSolicitudesCreditos, revisarSolicitudCreditos, type SolicitudCreditos } from '@/api/credits.api'

const solicitudes = ref<SolicitudCreditos[]>([])
const cargando = ref(true)
const actualizando = ref<number | null>(null)
const error = ref('')
const mensaje = ref('')

async function cargar() {
  cargando.value = true; error.value = ''
  try { solicitudes.value = await listarSolicitudesCreditos() }
  catch (fallo) { error.value = axios.isAxiosError(fallo) ? fallo.response?.data?.mensaje ?? 'No fue posible consultar las solicitudes.' : 'No fue posible consultar las solicitudes.' }
  finally { cargando.value = false }
}

async function revisar(solicitud: SolicitudCreditos, decision: 'Aprobada' | 'Rechazada') {
  actualizando.value = solicitud.id; error.value = ''; mensaje.value = ''
  try { await revisarSolicitudCreditos(solicitud.id, decision); mensaje.value = `Solicitud de ${solicitud.nombreEstudiante} ${decision.toLowerCase()}.`; await cargar() }
  catch (fallo) { error.value = axios.isAxiosError(fallo) ? fallo.response?.data?.mensaje ?? 'No fue posible guardar la decisión.' : 'No fue posible guardar la decisión.' }
  finally { actualizando.value = null }
}

onMounted(() => void cargar())
</script>

<template>
  <main class="page">
    <RouterLink class="back" to="/admin/home">← Volver al panel</RouterLink>
    <header><p class="eyebrow">Administración académica</p><h1>Solicitudes de créditos</h1><p>Revisa las solicitudes de ampliación de carga académica. Aprobarlas suma esos créditos al cupo del estudiante durante el periodo indicado.</p></header>
    <p v-if="error" class="notice error" role="alert">{{ error }}</p><p v-if="mensaje" class="notice success" role="status">{{ mensaje }}</p>
    <p v-if="cargando" class="notice" role="status">Consultando solicitudes…</p>
    <section v-else-if="!solicitudes.length" class="notice">No hay solicitudes de créditos.</section>
    <section v-else class="list" aria-label="Solicitudes de créditos">
      <article v-for="solicitud in solicitudes" :key="solicitud.id" class="request">
        <div class="heading"><div><h2>{{ solicitud.nombreEstudiante }}</h2><p>Cédula {{ solicitud.cedula }} · Periodo {{ solicitud.periodo }}</p></div><span class="status" :class="solicitud.estado.toLowerCase()">{{ solicitud.estado }}</span></div>
        <p><strong>{{ solicitud.creditos }} créditos solicitados</strong></p><p class="reason">{{ solicitud.motivo }}</p>
        <p class="date">Enviada: {{ new Date(solicitud.solicitadoEn).toLocaleString() }}</p>
        <div v-if="solicitud.estado === 'Pendiente'" class="actions">
          <button type="button" :disabled="actualizando !== null" @click="revisar(solicitud, 'Aprobada')">{{ actualizando === solicitud.id ? 'Guardando…' : 'Aprobar' }}</button>
          <button type="button" class="reject" :disabled="actualizando !== null" @click="revisar(solicitud, 'Rechazada')">Rechazar</button>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.page{max-width:950px;margin:0 auto;padding:30px clamp(16px,4vw,42px);color:#243a3c}.back{color:#176d85;text-decoration:none;font-size:13px}.eyebrow{margin:24px 0 7px;color:#1685a2;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}h1{margin:0;font-size:clamp(25px,4vw,34px)}header>p:last-child,.request p{color:#718083;font-size:13px;line-height:1.6}.notice,.request{margin:16px 0;padding:18px;border:1px solid #dce3e3;border-radius:8px;background:#fff}.list{display:grid;gap:12px}.request{margin:0}.heading{display:flex;justify-content:space-between;gap:14px;align-items:start}.heading h2{margin:0;color:#243a3c;font-size:18px}.heading p,.date{margin:5px 0;color:#718083;font-size:12px}.status{padding:5px 8px;border-radius:14px;background:#f2f4f4;font-size:11px}.status.pendiente{color:#805a17;background:#fff6dd}.status.aprobada{color:#246c4a;background:#eaf5ee}.status.rechazada{color:#8d3028;background:#fff0ed}.reason{white-space:pre-wrap}.actions{display:flex;gap:8px}.actions button{padding:9px 14px;border:0;border-radius:5px;color:#fff;background:#176d85;font:inherit;cursor:pointer}.actions .reject{color:#8d3028;background:#fff0ed}.actions button:disabled{opacity:.55}.error{color:#8d3028}.success{color:#246c4a}
</style>
