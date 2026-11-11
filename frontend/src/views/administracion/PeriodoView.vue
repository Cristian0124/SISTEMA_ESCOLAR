<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { consultarPeriodo, guardarPeriodo } from '@/api/monitoreo.api'
const apertura = ref('')
const cierre = ref('')
const habilitado = ref(false)
const mensaje = ref('')
const ocupado = ref(false)
function fechaLocal(iso: string) {
  const fecha = new Date(iso)
  return new Date(fecha.getTime()-fecha.getTimezoneOffset()*60000).toISOString().slice(0,16)
}
onMounted(async () => {
  try {
    const p = await consultarPeriodo()
    if (p) { apertura.value=fechaLocal(p.apertura); cierre.value=fechaLocal(p.cierre); habilitado.value=p.habilitado }
  } catch { mensaje.value='No fue posible consultar la configuración.' }
})
async function guardar() {
  ocupado.value=true
  mensaje.value=''
  try {
    if (!apertura.value || !cierre.value || apertura.value >= cierre.value) {
      mensaje.value='La apertura debe ser anterior al cierre.'
      return
    }
    const p = await guardarPeriodo({
      apertura:new Date(apertura.value).toISOString(),cierre:new Date(cierre.value).toISOString(),habilitado:habilitado.value
    })
    mensaje.value=`Periodo ${p.codigo} guardado. ${p.abierto ? 'Matrícula abierta.' : 'Matrícula cerrada o programada.'}`
  } catch { mensaje.value='No se pudo guardar el periodo. Revisa las fechas y tu conexión.' }
  finally { ocupado.value=false }
}
</script>
<template>
  <main class="period-page">
    <RouterLink to="/admin/home">Volver a administración</RouterLink>
    <h1>Apertura de matrícula</h1>
    <p>Configura el periodo académico vigente. Las fechas se muestran en la zona horaria de tu equipo.</p>
    <p>Al cerrar, las solicitudes que aún no se hayan confirmado serán rechazadas al procesarse.</p>
    <form @submit.prevent="guardar">
      <label>Apertura <input v-model="apertura" required type="datetime-local" /></label>
      <label>Cierre <input v-model="cierre" required type="datetime-local" /></label>
      <label><input v-model="habilitado" type="checkbox" /> Habilitar matrícula dentro de estas fechas</label>
      <button :disabled="ocupado">{{ ocupado ? 'Guardando…' : 'Guardar configuración' }}</button>
    </form>
    <p role="status">{{ mensaje }}</p>
  </main>
</template>
<style scoped>
.period-page { max-width:720px; margin:auto; padding:32px }
form { display:grid; gap:20px; margin-top:25px }
label { display:flex; gap:12px; flex-wrap:wrap; align-items:center }
input,button { padding:10px }
button { justify-self:start; background:#185a69; color:white; border:0; border-radius:4px }
</style>
