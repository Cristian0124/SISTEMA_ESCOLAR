<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { consultarMetricas, type MetricasMatricula } from '@/api/monitoreo.api'
const metricas=ref<MetricasMatricula | null>(null)
const error=ref('')
const seleccionada=ref('')
const prueba=computed(() => {
  const pruebas=metricas.value?.pruebasCarga ?? []
  return pruebas.find(p=>p.id===seleccionada.value) ?? pruebas[0] ?? null
})
const resumenPrueba=computed(() => {
  const p=prueba.value
  const finales=p?.resultado?.estados
  const contar=(estado:string) => finales ? finales.find(e=>e.estado===estado)?.cantidad ?? 0 : undefined
  const pendientes=contar('en_espera') ?? p?.progreso.pendientes ?? 0
  const procesando=contar('procesando') ?? p?.progreso.procesando ?? 0
  const confirmadas=contar('confirmada') ?? p?.progreso.confirmadas ?? 0
  const rechazadas=contar('rechazada') ?? p?.progreso.rechazadas ?? 0
  const terminadas=confirmadas+rechazadas
  return { pendientes,procesando,confirmadas,rechazadas,terminadas,
    porcentaje:p ? Math.min(100,Math.floor(terminadas/p.estudiantes*1000)/10):0 }
})
let timer: ReturnType<typeof setInterval> | undefined
let consultando=false
let desmontado=false
async function actualizar() {
  if (consultando) return
  consultando=true
  try {
    const datos=await consultarMetricas()
    if (!desmontado) { metricas.value=datos; error.value='' }
  } catch {
    if (!desmontado) error.value='No se pudieron actualizar las métricas. Los valores visibles corresponden a la última consulta.'
  } finally { consultando=false }
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
    <p>Actualización cada dos segundos. Las pruebas por terminal y las matrículas de la aplicación se muestran por separado.</p>
    <p v-if="error" role="alert">{{ error }}</p>

    <section class="load-panel" aria-labelledby="titulo-carga">
      <h2 id="titulo-carga">Pruebas de carga desde la terminal</h2>
      <p>El comando <code>npm.cmd run test:carga</code> publica aquí su avance y conserva el resultado al terminar.</p>
      <template v-if="prueba">
        <label>Seleccionar ejecución
          <select v-model="seleccionada">
            <option value="">Última ejecución</option>
            <option v-for="p in metricas?.pruebasCarga" :key="p.id" :value="p.id">
              {{ new Date(p.iniciadaEn).toLocaleString() }} · {{ p.estudiantes }} estudiantes
            </option>
          </select>
        </label>
        <p class="load-state" role="status">
          {{ prueba.estado }} · {{ prueba.estudiantes }} estudiantes · {{ prueba.cupos }} cupos · {{ prueba.conexiones }} conexiones HTTP máximas
        </p>
        <p v-if="prueba.sinActualizacion" role="alert">La ejecución dejó de enviar métricas. Revisa la terminal.</p>
        <p v-if="prueba.pausaMs">Esta ejecución incluye pausas de exposición de {{ prueba.pausaMs }} ms.</p>
        <p>{{ resumenPrueba.terminadas }} de {{ prueba.estudiantes }} solicitudes terminadas · {{ resumenPrueba.porcentaje }} %</p>
        <progress :value="resumenPrueba.terminadas" :max="prueba.estudiantes" aria-label="Progreso de la prueba de carga"></progress>
        <dl class="metrics load-metrics">
          <div><dt>En espera · prueba</dt><dd>{{ resumenPrueba.pendientes }}</dd></div>
          <div><dt>Procesando · prueba</dt><dd>{{ resumenPrueba.procesando }}</dd></div>
          <div><dt>Confirmadas · prueba</dt><dd>{{ resumenPrueba.confirmadas }}</dd></div>
          <div><dt>Rechazadas · prueba</dt><dd>{{ resumenPrueba.rechazadas }}</dd></div>
        </dl>
        <template v-if="prueba.proceso">
          <p>Proceso de carga {{ prueba.pid }} · Solicitudes HTTP {{ prueba.proceso.solicitudesHttp }} · Errores 5xx {{ prueba.proceso.erroresHttp }} · Memoria {{ prueba.proceso.memoriaMb }} MB</p>
          <p>Tiempo HTTP promedio {{ Math.round(prueba.proceso.promedioHttpMs) }} ms · Conexiones BD {{ prueba.proceso.conexionesBD }}</p>
        </template>
        <p v-if="prueba.mensaje">{{ prueba.mensaje }}</p>
        <div v-if="prueba.resultado" class="load-result">
          <p><strong>{{ prueba.resultado.correcto ? 'Verificaciones de integridad correctas' : 'Hay verificaciones fallidas' }}</strong></p>
          <p>Duración {{ (prueba.resultado.totalMs/1000).toFixed(2) }} segundos · Duplicados {{ prueba.resultado.duplicadas }} · Reintento seguro {{ prueba.resultado.idempotente ? 'Sí' : 'No' }}</p>
          <p>El 95 % de las peticiones recibió respuesta en {{ (prueba.resultado.latenciaHttpMs.p95/1000).toFixed(2) }} segundos o menos.</p>
          <p v-if="Object.keys(prueba.resultado.errores).length || Object.keys(prueba.resultado.erroresTransporte).length" role="alert">Se registraron errores HTTP o reintentos de transporte. Revisa el JSON de resultados.</p>
        </div>
        <small>Última muestra de esta ejecución {{ new Date(prueba.actualizadaEn).toLocaleTimeString() }}. Se conservan las últimas cinco ejecuciones de las últimas 24 horas en esta vista.</small>
      </template>
      <p v-else>Todavía no hay pruebas de carga registradas durante las últimas 24 horas.</p>
    </section>

    <template v-if="metricas">
      <h2>Matrícula de la aplicación</h2>
      <p>Estados de las solicitudes recibidas hoy en la aplicación. Última actualización {{ new Date(metricas.actualizadoEn).toLocaleTimeString() }}.</p>
      <p v-if="!metricas.workers" role="alert">No hay workers activos para la aplicación. Sus solicitudes permanecerán en espera.</p>
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
      <p>Estos contadores HTTP corresponden a la instancia que sirve este panel y se reinician con el proceso.</p>
    </template>
  </main>
</template>
<style scoped>
.monitor-page { max-width:1100px; margin:auto; padding:30px; color:#233f4a }
.metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:16px }
.metrics div { background:#fff; padding:20px; border:1px solid #ccdce0; border-radius:8px }
dd { margin:12px 0 0; font-size:28px; font-weight:bold }
[role=alert] { color:#9b2226 }
.load-panel { margin:24px 0 32px; padding:24px; border:1px solid #9bbfb7; border-radius:12px; background:#f3f9f6 }
.load-panel h2 { margin-top:0 }
.load-panel label { display:flex; align-items:center; gap:12px; flex-wrap:wrap }
select { padding:9px; max-width:100% }
.load-state { font-weight:600 }
progress { width:100%; height:12px; accent-color:#248575 }
.load-result { border-top:1px solid #b9d3c9; margin-top:16px; padding-top:8px }
small { color:#526e68; line-height:1.6 }
</style>
