<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { consultarMetricas, type MetricasMatricula } from '@/api/monitoreo.api'
const metricas=ref<MetricasMatricula | null>(null)
const error=ref('')
let timer: ReturnType<typeof setInterval> | undefined
let consultando=false
let desmontado=false
async function actualizar() {
  if (consultando) return
  consultando=true
  try { metricas.value=await consultarMetricas(); error.value='' }
  catch { error.value='No se pudieron actualizar las métricas. Los valores visibles corresponden a la última consulta.' }
  finally { consultando=false }
}
onMounted(async () => {
  await actualizar()
  if (!desmontado) timer=setInterval(() => { void actualizar() },2000)
})
onUnmounted(() => { desmontado=true; clearInterval(timer) })
</script>
<template>
  <main class="monitor-page">
    <RouterLink to="/admin/home">Volver a administración</RouterLink>
    <h1>Monitoreo en vivo</h1>
    <RouterLink to="/admin/simulacion">Abrir demostración visual de cupos</RouterLink>
    <p>Actualización cada dos segundos. Los estados y tiempos corresponden a las solicitudes recibidas hoy.</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <template v-if="metricas">
      <p>Última actualización {{ new Date(metricas.actualizadoEn).toLocaleTimeString() }}</p>
      <p v-if="!metricas.workers" role="alert">No hay workers activos. Las solicitudes permanecerán en espera.</p>
      <dl class="metrics">
        <div><dt>En espera</dt><dd>{{ metricas.pendientes }}</dd></div>
        <div><dt>Procesando</dt><dd>{{ metricas.procesando }}</dd></div>
        <div><dt>Confirmadas</dt><dd>{{ metricas.confirmadas }}</dd></div>
        <div><dt>Rechazadas</dt><dd>{{ metricas.rechazadas }}</dd></div>
        <div><dt>Reservas activas</dt><dd>{{ metricas.reservas }}</dd></div>
        <div><dt>Workers activos</dt><dd>{{ metricas.workers }}</dd></div>
        <div><dt>Tiempo total p95</dt><dd>{{ metricas.latenciaP95Ms === null ? 'Sin datos' : Math.round(metricas.latenciaP95Ms) + ' ms' }}</dd></div>
        <div><dt>Memoria del proceso</dt><dd>{{ metricas.proceso.memoriaMb }} MB</dd></div>
      </dl>
      <h2>API · proceso {{ metricas.proceso.pid }}</h2>
      <p>Solicitudes HTTP {{ metricas.proceso.solicitudesHttp }} · Errores 5xx {{ metricas.proceso.erroresHttp }}</p>
      <p>Tiempo HTTP promedio {{ Math.round(metricas.proceso.promedioHttpMs) }} ms</p>
      <p>Conexiones BD {{ metricas.proceso.conexionesBD }} · En espera {{ metricas.proceso.conexionesEnEsperaBD }}</p>
      <p>Los contadores HTTP corresponden a esta instancia y se reinician con el proceso. Los estados de matrícula se consultan en PostgreSQL.</p>
    </template>
  </main>
</template>
<style scoped>
.monitor-page { max-width:1100px; margin:auto; padding:30px; color:#233f4a }
.metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:16px }
.metrics div { background:#fff; padding:20px; border:1px solid #ccdce0; border-radius:8px }
dd { margin:12px 0 0; font-size:28px; font-weight:bold }
[role=alert] { color:#9b2226 }
</style>
