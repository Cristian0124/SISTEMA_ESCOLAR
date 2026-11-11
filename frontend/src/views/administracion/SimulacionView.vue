<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { isAxiosError } from 'axios'
import { consultarSimulacion, iniciarSimulacion, type EstadoSimulacion } from '@/api/simulacion.api'

const estudiantes = ref(2000)
const cupos = ref(30)
const modoExposicion = ref(true)
const prueba = ref<EstadoSimulacion | null>(null)
const enviando = ref(false)
const error = ref('')
const historial = ref<{ tiempo:number; terminadas:number; pendientes:number }[]>([])
let consultando = false
let desmontado = false
let temporizador: ReturnType<typeof setInterval> | undefined
const activa = computed(() => !!prueba.value && ['preparando','ejecutando','verificando'].includes(prueba.value.estado))
const resultado = computed(() => prueba.value?.resultado)
const progreso = computed(() => prueba.value?.progreso)
const total = computed(() => prueba.value?.estudiantes || estudiantes.value)
const capacidad = computed(() => prueba.value?.cupos || cupos.value)
const confirmadas = computed(() => progreso.value?.matriculas ?? resultado.value?.matriculas ?? 0)
const rechazadas = computed(() => progreso.value?.rechazadas ?? resultado.value?.motivosRechazo.reduce((n,m) => n+m.cantidad,0) ?? 0)
const terminadas = computed(() => (progreso.value?.confirmadas ?? resultado.value?.matriculas ?? 0) + rechazadas.value)
const porcentaje = computed(() => Math.min(100, Math.floor(terminadas.value / total.value * 1000) / 10))
const etiquetas = {
  sin_iniciar:'Lista para iniciar', preparando:'Preparando datos',
  ejecutando:'Procesando solicitudes', verificando:'Verificando y limpiando',
  completada:'Prueba completada', fallida:'La prueba requiere revisión'
}
const estadoTexto = computed(() => etiquetas[prueba.value?.estado ?? 'sin_iniciar'])
const motivosPorCupo = computed(() => resultado.value?.motivosRechazo
  .filter(m => m.codigo_error === 'SIN_CUPOS').reduce((s,m) => s + m.cantidad,0) ?? 0)
const comprobaciones = computed(() => [
  { titulo:'Capacidad respetada', cumple:resultado.value ? resultado.value.matriculas === resultado.value.cupos : null,
    texto:resultado.value ? `${resultado.value.matriculas} matrículas para ${resultado.value.cupos} cupos.` : 'Se contará la matrícula guardada en PostgreSQL.' },
  { titulo:'Sin inscripciones duplicadas', cumple:resultado.value ? resultado.value.duplicadas === 0 : null,
    texto:resultado.value ? `${resultado.value.duplicadas} grupos duplicados por estudiante, curso y periodo.` : 'Se buscarán registros repetidos en la base de datos.' },
  { titulo:'Reintento seguro', cumple:resultado.value?.idempotente ?? null,
    texto:resultado.value ? 'Se repitió una solicitud y se comparó su identificador.' : 'Se reenviará una petición con la misma clave.' },
  { titulo:'Rechazos por falta de cupo', cumple:resultado.value ? motivosPorCupo.value === resultado.value.estudiantes - resultado.value.cupos : null,
    texto:resultado.value ? `${motivosPorCupo.value} solicitudes rechazadas con el código SIN_CUPOS.` : 'Se comprobará el motivo de cada rechazo.' }
])
function registrar(estado:EstadoSimulacion) {
  if (prueba.value?.id !== estado.id) historial.value = []
  const anterior = prueba.value?.progreso?.transcurridoMs
  prueba.value = estado
  if (estado.progreso && estado.progreso.transcurridoMs !== anterior) {
    const p = estado.progreso
    historial.value.push({tiempo:p.transcurridoMs,terminadas:p.confirmadas+p.rechazadas,pendientes:p.pendientes})
    if (historial.value.length > 180) historial.value.shift()
  }
}
function linea(campo:'terminadas' | 'pendientes') {
  const datos = historial.value
  if (!datos.length) return ''
  const inicio = datos[0].tiempo
  const ancho = Math.max(1,datos[datos.length-1].tiempo-inicio)
  return datos.map(p => `${20+(p.tiempo-inicio)/ancho*660},${145-p[campo]/total.value*125}`).join(' ')
}
async function actualizar() {
  if (consultando) return
  consultando = true
  try {
    const estado = await consultarSimulacion()
    if (!desmontado) { registrar(estado); error.value = '' }
  } catch {
    if (!desmontado) error.value = 'No se pudo actualizar la prueba. La ejecución puede continuar en el servidor.'
  } finally { consultando = false }
}
async function iniciar() {
  if (activa.value || enviando.value) return
  enviando.value = true
  error.value = ''
  try {
    const estado = await iniciarSimulacion({estudiantes:estudiantes.value,cupos:cupos.value,modoExposicion:modoExposicion.value})
    if (!desmontado) registrar(estado)
  } catch (fallo) {
    error.value = isAxiosError<{mensaje?:string}>(fallo)
      ? fallo.response?.data.mensaje ?? 'No fue posible iniciar la prueba.'
      : 'No fue posible iniciar la prueba.'
  } finally { enviando.value = false }
}
function descargar() {
  if (!prueba.value) return
  const url = URL.createObjectURL(new Blob([JSON.stringify(prueba.value,null,2)],{type:'application/json'}))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = 'demostracion-matricula.json'
  enlace.click()
  URL.revokeObjectURL(url)
}
onMounted(async () => {
  await actualizar()
  if (!desmontado) temporizador = setInterval(() => { void actualizar() },750)
})
onUnmounted(() => { desmontado = true; clearInterval(temporizador) })
</script>

<template>
  <main class="demo-page">
    <header class="demo-heading">
      <div>
        <RouterLink to="/admin/home">Volver a administración</RouterLink>
        <p class="eyebrow">LABORATORIO DE MATRÍCULA</p>
        <h1>Muchos estudiantes. Cupos limitados.</h1>
        <p>Observa cómo llegan las solicitudes, se reservan los lugares y se confirma cada matrícula.</p>
      </div>
      <span class="status" :class="{live:activa}" role="status">{{ estadoTexto }}</span>
    </header>

    <section class="configuration" aria-label="Configurar demostración">
      <form @submit.prevent="iniciar">
        <label>Estudiantes
          <select v-model.number="estudiantes" :disabled="activa || enviando">
            <option :value="100">100 estudiantes</option>
            <option :value="500">500 estudiantes</option>
            <option :value="2000">2.000 estudiantes</option>
          </select>
        </label>
        <label>Cupos del curso
          <input v-model.number="cupos" type="number" min="1" :max="Math.min(200,estudiantes)" required :disabled="activa || enviando" />
        </label>
        <label class="mode"><input v-model="modoExposicion" type="checkbox" :disabled="activa || enviando" /> Modo exposición</label>
        <button type="submit" :disabled="activa || enviando">{{ enviando ? 'Iniciando…' : activa ? 'Prueba en ejecución' : 'Iniciar demostración' }}</button>
      </form>
      <p>Se crean estudiantes y un curso en un esquema temporal. La prueba usa hasta 128 conexiones HTTP y cuatro consumidores.</p>
      <p v-if="activa ? prueba?.modoExposicion : modoExposicion" class="exposure">Modo exposición activo. Se añaden pausas de 40 ms para observar los cambios. Estos tiempos incluyen la pausa.</p>
      <p v-else>Sin pausas de exposición. Se mide el procesamiento de la prueba local.</p>
    </section>

    <p v-if="error" class="alert" role="alert">{{ error }}</p>
    <p v-if="prueba?.estado === 'fallida'" class="alert" role="alert">{{ prueba.mensaje }}</p>
    <p v-else class="explanation" aria-live="polite">{{ prueba?.mensaje }}</p>

    <section class="flow" aria-label="Recorrido de las solicitudes">
      <article><span class="step">01 · RECIBIDAS</span><strong>{{ progreso?.recibidas ?? 0 }}<small> / {{ total }}</small></strong><p>Ya están guardadas en la cola.</p></article>
      <article class="waiting"><span class="step">02 · EN ESPERA</span><strong>{{ progreso?.pendientes ?? 0 }}</strong><p>Esperan un turno para procesarse.</p></article>
      <article class="processing"><span class="step">03 · PROCESANDO</span><strong>{{ progreso?.procesando ?? 0 }}</strong><p>Se revisan cupos y condiciones.</p></article>
      <article class="done"><span class="step">04 · TERMINADAS</span><strong>{{ terminadas }}</strong><p>{{ confirmadas }} confirmadas · {{ rechazadas }} rechazadas.</p></article>
    </section>

    <section class="visual-grid">
      <article class="panel seats">
        <div class="panel-title"><h2>Los lugares del curso</h2><span>{{ confirmadas }} / {{ capacidad }} ocupados</span></div>
        <p>Cada cuadro representa un cupo. El amarillo indica una reserva que todavía puede vencer.</p>
        <div class="seat-grid" aria-hidden="true">
          <span v-for="n in Math.min(capacidad,60)" :key="n" class="seat"
            :class="{occupied:n<=confirmadas,reserved:n>confirmadas && n<=confirmadas+(progreso?.reservas ?? 0)}">{{ n }}</span>
        </div>
        <p v-if="capacidad>60">Se muestran los primeros 60 cupos de {{ capacidad }}.</p>
        <div class="legend"><span><i class="green"></i> Matriculado {{ confirmadas }}</span><span><i class="amber"></i> Reservado {{ progreso?.reservas ?? 0 }}</span><span><i></i> Libre {{ Math.max(0,capacidad-confirmadas-(progreso?.reservas ?? 0)) }}</span></div>
        <p v-if="confirmadas+(progreso?.reservas ?? 0)>capacidad" class="alert" role="alert">La ocupación observada supera la capacidad. Revisa la prueba.</p>
      </article>

      <article class="panel evolution">
        <div class="panel-title"><h2>Avance de la prueba</h2><span>{{ porcentaje }} %</span></div>
        <progress :value="terminadas" :max="total" :aria-label="`${terminadas} de ${total} solicitudes terminadas`"></progress>
        <svg viewBox="0 0 700 165" role="img" aria-label="Evolución de solicitudes en espera y terminadas durante esta vista">
          <line x1="20" y1="145" x2="680" y2="145" stroke="#ccd8db" />
          <line x1="20" y1="20" x2="680" y2="20" stroke="#e6edef" stroke-dasharray="5 5" />
          <polyline :points="linea('pendientes')" fill="none" stroke="#bd7e23" stroke-width="3" />
          <polyline :points="linea('terminadas')" fill="none" stroke="#248575" stroke-width="3" />
        </svg>
        <div class="legend"><span><i class="amber"></i> En espera</span><span><i class="green"></i> Terminadas</span></div>
        <p>{{ ((progreso?.transcurridoMs ?? resultado?.totalMs ?? 0)/1000).toFixed(1) }} segundos desde el inicio. Las líneas muestran las muestras recibidas mientras esta vista está abierta.</p>
      </article>
    </section>

    <section class="checks-section">
      <h2>¿Se respetaron las reglas?</h2>
      <p>Las comprobaciones se completan consultando PostgreSQL y repitiendo una petición real.</p>
      <div class="checks">
        <article v-for="c in comprobaciones" :key="c.titulo" :class="{passed:c.cumple===true,failed:c.cumple===false}">
          <span class="check-state">{{ c.cumple===null ? 'Por verificar' : c.cumple ? 'Cumple' : 'Revisar' }}</span>
          <h3>{{ c.titulo }}</h3><p>{{ c.texto }}</p>
        </article>
      </div>
    </section>

    <section v-if="resultado" class="panel results">
      <h2>Resultado de esta ejecución</h2>
      <p>{{ resultado.estudiantes }} estudiantes · {{ resultado.conexionesMaximas }} conexiones HTTP máximas · {{ (resultado.totalMs/1000).toFixed(2) }} segundos hasta terminar.</p>
      <p>El 95 % de las peticiones recibió respuesta en {{ (resultado.latenciaHttpMs.p95/1000).toFixed(2) }} segundos o menos.</p>
      <p v-if="resultado.pausaDemostracionMs">Esta ejecución incluye pausas de exposición. Desactiva el modo para medir el procesamiento sin esas pausas.</p>
      <p v-if="Object.keys(resultado.errores).length || Object.keys(resultado.erroresTransporte).length" class="alert">Se registraron errores HTTP o reintentos de transporte. Consulta el archivo descargado.</p>
      <button type="button" class="secondary" @click="descargar">Descargar resultado</button>
      <details><summary>Cómo se comprueban los resultados</summary>
        <p>Capacidad. Se cuentan las matrículas y se comparan con los cupos del curso.</p>
        <p>Duplicados. Se agrupa por estudiante, curso y periodo y se buscan grupos con más de un registro.</p>
        <p>Reintento. Se vuelve a enviar una solicitud con la misma clave y se compara el identificador devuelto.</p>
        <p>Rechazos. Se agrupan los motivos y se comprueba cuántos tienen el código SIN_CUPOS.</p>
      </details>
    </section>
    <footer>La demostración ejecuta solicitudes reales sobre datos temporales. El panel de monitoreo general muestra las solicitudes de la aplicación.</footer>
  </main>
</template>

<style scoped>
.demo-page { max-width:1200px; margin:auto; padding:32px clamp(16px,3vw,38px); color:#193b42; font-family:Arial,sans-serif }
.demo-heading { display:flex; justify-content:space-between; gap:24px; align-items:flex-start; margin-bottom:24px }
.demo-heading a { color:#39717a; font-size:13px }
.eyebrow { margin:24px 0 10px; font-size:11px; font-weight:700; letter-spacing:.15em; color:#607b80 }
h1 { margin:0; font-size:clamp(25px,3vw,35px); letter-spacing:-.035em }
p { line-height:1.55; font-size:14px }
.status { flex-shrink:0; border:1px solid #ccdadd; border-radius:30px; padding:9px 14px; font-size:12px; background:white }
.live { border-color:#84baa7; background:#e3f1e8 }
.live::before { content:''; display:inline-block; width:7px; height:7px; border-radius:50%; background:#248575; margin-right:8px; animation:blink 1.2s infinite }
.configuration,.panel { border:1px solid #d4e0e1; background:white; border-radius:12px; padding:22px }
.configuration form { display:flex; gap:18px; align-items:flex-end; flex-wrap:wrap }
label { display:grid; gap:8px; font-size:13px; font-weight:600 }
input[type=number],select { border:1px solid #bbcfd2; border-radius:5px; padding:10px; background:#fff; color:#193b42; min-height:40px }
input[type=number] { width:110px }
.mode { display:flex; align-items:center; gap:8px; min-height:40px }
button { background:#195d64; color:#fff; border:0; padding:12px 18px; border-radius:6px; font-weight:600; cursor:pointer; min-height:42px }
button:disabled { opacity:.55; cursor:default }
.configuration p { margin-bottom:0; color:#526f75; font-size:12px }
.configuration .exposure { color:#8a5b16 }
.explanation { min-height:22px; color:#526f75 }
.alert { color:#a13a38; background:#fff0ee; padding:12px; border-radius:6px }
.flow { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin:22px 0 }
.flow article { background:#edf2f3; padding:19px; border-radius:9px; border-top:3px solid #809ba1 }
.step { font-size:10px; letter-spacing:.09em; font-weight:bold }
.flow strong { display:block; font-size:34px; margin:14px 0 10px; font-variant-numeric:tabular-nums }
.flow small { font-size:14px; color:#648088; font-weight:400 }
.flow p { font-size:12px; margin-bottom:0 }
.flow .waiting { background:#faf3e6; border-color:#bd7e23 }
.flow .processing { background:#edf0fb; border-color:#6a78ae }
.flow .done { background:#e7f3ed; border-color:#248575 }
.visual-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px }
.panel-title { display:flex; gap:12px; align-items:center; justify-content:space-between }
h2 { font-size:18px; margin:0 0 8px }
.panel-title span { font-size:12px; white-space:nowrap }
.seat-grid { display:grid; grid-template-columns:repeat(10,1fr); gap:7px; margin:22px 0 }
.seat { aspect-ratio:1; border:1px solid #c8d8da; border-radius:6px; display:grid; place-items:center; color:#789298; font-size:11px; transition:background .3s,color .3s,border-color .3s }
.seat.occupied { background:#248575; border-color:#248575; color:white }
.seat.reserved { background:#f6d497; border-color:#cf9a3e; color:#755017; animation:blink 1s infinite }
.legend { display:flex; gap:14px; flex-wrap:wrap; font-size:11px; color:#4a676d }
.legend span { display:flex; gap:6px; align-items:center }
.legend i { width:9px; height:9px; background:#e2ebec; border-radius:2px }
.legend .green { background:#248575 }
.legend .amber { background:#bd7e23 }
progress { width:100%; height:10px; accent-color:#248575; margin-top:14px }
svg { display:block; width:100%; margin:12px 0 }
.evolution>p { font-size:12px; color:#607c81 }
.checks-section { margin:28px 0 }
.checks { display:grid; grid-template-columns:repeat(4,1fr); gap:12px }
.checks article { background:white; border:1px solid #d8e2e3; border-radius:9px; padding:18px }
.checks h3 { font-size:14px; margin:15px 0 8px }
.checks p { font-size:12px; margin-bottom:0 }
.check-state { font-size:11px; color:#687d82; font-weight:bold }
.checks .passed { border-color:#8ab6a4; background:#f1f9f5 }
.passed .check-state { color:#217359 }
.checks .failed { border-color:#c6817a; background:#fff5f3 }
.failed .check-state { color:#a13a38 }
.results .secondary { background:#edf3f4; color:#195d64; border:1px solid #b7cfd2 }
details { margin-top:20px; padding-top:16px; border-top:1px solid #d8e2e3 }
summary { cursor:pointer; font-size:13px; font-weight:600 }
footer { padding:24px 0 8px; font-size:12px; line-height:1.6; color:#607b80 }
@keyframes blink { 50% { opacity:.55 } }
@media (max-width:850px) { .flow,.checks { grid-template-columns:repeat(2,1fr) } .visual-grid { grid-template-columns:1fr } .demo-heading { flex-direction:column } }
@media (max-width:450px) { .flow,.checks { grid-template-columns:1fr } .seat-grid { gap:4px } .panel { padding:16px } }
@media (prefers-reduced-motion:reduce) { *,*::before { animation:none!important; transition:none!important } }
</style>
