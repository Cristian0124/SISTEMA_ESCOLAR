<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { listarCarreras, consultarPensum, type Carrera, type Asignatura } from '@/api/academico.api'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/axios'
import axios from 'axios'
const auth = useAuthStore()
const carreras = ref<Carrera[]>([])
const seleccion = ref('')
const materias = ref<Asignatura[]>([])
const cargando = ref(false)
const error = ref('')
const estudiantes = ref<{ id: number; nombre: string; cedula: string }[]>([])
const estudianteId = ref('')
const asignando = ref(false)
const mensaje = ref('')
async function asignarCarrera() {
  if (!estudianteId.value || !seleccion.value) return
  asignando.value = true
  mensaje.value = ''
  error.value = ''
  try {
    await api.patch(`/academico/estudiantes/${estudianteId.value}/carrera`, { carreraCodigo: seleccion.value })
    estudiantes.value = estudiantes.value.filter(e => e.id !== Number(estudianteId.value))
    estudianteId.value = ''
    mensaje.value = 'Carrera asignada. El estudiante debe iniciar sesión nuevamente para actualizar su perfil.'
  } catch (e) { error.value = axios.isAxiosError(e) ? e.response?.data?.mensaje ?? 'No fue posible asignar la carrera.' : 'No fue posible asignar la carrera.' }
  finally { asignando.value = false }
}
const carrera = computed(() => carreras.value.find(c => c.codigo === seleccion.value))
const semestres = computed(() => [...new Set(materias.value.map(m => m.semestre))])
let solicitud = 0
async function cargarPensum() {
  const actual = ++solicitud
  materias.value = []
  error.value = ''
  if (!seleccion.value) return
  cargando.value = true
  try {
    const datos = await consultarPensum(seleccion.value)
    if (actual === solicitud) materias.value = datos
  } catch { if (actual === solicitud) error.value = 'No fue posible consultar el pénsum.' }
  finally { if (actual === solicitud) cargando.value = false }
}
watch(seleccion, cargarPensum)
async function cargar() {
  error.value = ''
  try {
    carreras.value = await listarCarreras()
    if (auth.usuario?.rol === 'admin') estudiantes.value = (await api.get('/academico/estudiantes/sin-carrera')).data
    seleccion.value = auth.usuario?.carreraCodigo ?? carreras.value[0]?.codigo ?? ''
    if (seleccion.value) await cargarPensum()
  } catch { error.value = 'No fue posible cargar las carreras. Intenta nuevamente.' }
}
onMounted(cargar)
</script>

<template>
  <main class="academic-page">
    <RouterLink to="/inicio">← Volver al inicio</RouterLink>
    <h1>Facultades, carreras y pénsum</h1>
    <p>Universidad Santiago de Cali · Facultad de Ingeniería</p>
    <label>Carrera
      <select v-model="seleccion">
        <option disabled value="">Selecciona una carrera</option>
        <option v-for="c in carreras" :key="c.codigo" :value="c.codigo">{{ c.nombre }} · {{ c.nivel }} · {{ c.modalidad }}</option>
      </select>
    </label>
    <form v-if="auth.usuario?.rol === 'admin' && estudiantes.length" @submit.prevent="asignarCarrera">
      <h2>Asignar carrera a estudiantes anteriores</h2>
      <p>Se asignará la carrera seleccionada arriba. Las notas y matrículas anteriores se conservan; las homologaciones requieren revisión académica.</p>
      <label>Estudiante<select v-model="estudianteId" required>
        <option disabled value="">Selecciona un estudiante</option>
        <option v-for="e in estudiantes" :key="e.id" :value="String(e.id)">{{ e.nombre }} · {{ e.cedula }}</option>
      </select></label>
      <button type="submit" :disabled="asignando || !seleccion || !estudianteId">{{ asignando ? 'Asignando…' : 'Asignar carrera seleccionada' }}</button>
    </form>
    <p v-if="mensaje" role="status">{{ mensaje }}</p>
    <p v-if="error" role="alert">{{ error }} <button @click="cargar">Reintentar</button></p>
    <p v-if="cargando" role="status">Consultando pénsum…</p>
    <template v-else-if="carrera">
      <h2>{{ carrera.nombre }}</h2>
      <p>{{ carrera.asignaturas }} asignaturas · {{ carrera.creditos }} créditos según las tablas publicadas.</p>
      <p><a :href="carrera.fuente" target="_blank" rel="noopener noreferrer">Consultar plan oficial USC ↗</a> · Consultado el 28 de octubre de 2026.</p>
      <p class="notice">Los prerrequisitos están pendientes de verificación académica. Los códigos son identificadores internos del sistema. Los totales de las tablas pueden diferir del resumen publicado por la universidad.</p>
      <section v-for="semestre in semestres" :key="semestre">
        <h3>Semestre {{ semestre }}</h3>
        <table><thead><tr><th scope="col">Asignatura</th><th scope="col">Créditos</th></tr></thead>
          <tbody><tr v-for="m in materias.filter(m => m.semestre === semestre)" :key="m.codigo"><td>{{ m.nombre }}</td><td>{{ m.creditos }}</td></tr></tbody>
        </table>
      </section>
    </template>
  </main>
</template>
<style scoped>
.academic-page { max-width: 1000px; margin: auto; padding: 32px 24px; color: #243a3c; }
a { color: #176d85; } label { display: grid; gap: 8px; margin: 24px 0; font-weight: 600; }
select { width: 100%; padding: 12px; border: 1px solid #bdcdcf; border-radius: 6px; background: white; color: inherit; }
section { margin: 24px 0; background: white; border: 1px solid #dce3e3; border-radius: 8px; padding: 18px; }
table { width: 100%; border-collapse: collapse; } th, td { text-align: left; padding: 10px 6px; border-bottom: 1px solid #e7eeee; }
th:last-child, td:last-child { text-align: right; }
.notice { padding: 16px; background: #fff8e7; border-radius: 6px; line-height: 1.6; }
</style>
