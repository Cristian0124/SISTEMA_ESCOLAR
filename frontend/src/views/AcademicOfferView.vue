<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { listarCarreras, consultarPensum, type Carrera, type Asignatura } from '@/api/academico.api'
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
const carreras = ref<Carrera[]>([])
const seleccion = ref('')
const materias = ref<Asignatura[]>([])
const cargando = ref(false)
const error = ref('')
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
    <p>Facultad de Ingeniería</p>
    <label>Carrera
      <select v-model="seleccion">
        <option disabled value="">Selecciona una carrera</option>
        <option v-for="c in carreras" :key="c.codigo" :value="c.codigo">{{ c.nombre }} · {{ c.nivel }} · {{ c.modalidad }}</option>
      </select>
    </label>
    <p v-if="error" role="alert">{{ error }} <button @click="cargar">Reintentar</button></p>
    <p v-if="cargando" role="status">Consultando pénsum…</p>
    <template v-else-if="carrera">
      <h2>{{ carrera.nombre }}</h2>
      <p>{{ carrera.asignaturas }} asignaturas · {{ carrera.creditos }} créditos.</p>
      <p class="notice">Los prerrequisitos están pendientes de verificación académica.</p>
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
