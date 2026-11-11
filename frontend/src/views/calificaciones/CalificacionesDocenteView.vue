<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listarCursosAsignados, listarEstudiantesDelCurso, registrarNota, type EstudianteDeCurso } from '@/api/calificaciones-docente.api'
import type { Curso } from '@/api/cursos.api'
const cursos=ref<Curso[]>([])
const cursoId=ref<number | null>(null)
const estudiantes=ref<EstudianteDeCurso[]>([])
const notas=ref<Record<number,number | undefined>>({})
const mensaje=ref('')
const ocupado=ref(false)
const seleccionado=computed(() => cursos.value.find(c=>c.id===cursoId.value))
onMounted(async () => {
  try { cursos.value=await listarCursosAsignados() }
  catch { mensaje.value='No fue posible consultar tus cursos.' }
})
async function cargar() {
  if (cursoId.value===null) return
  ocupado.value=true
  try {
    estudiantes.value=await listarEstudiantesDelCurso(cursoId.value)
    notas.value=Object.fromEntries(estudiantes.value.map(e=>[e.id,e.nota??undefined]))
  } catch { mensaje.value='No fue posible consultar los estudiantes.' }
  finally { ocupado.value=false }
}
async function guardar(e: EstudianteDeCurso) {
  const nota=notas.value[e.id]
  if (!seleccionado.value || typeof nota!=='number' || nota<0 || nota>5) { mensaje.value='La nota debe estar entre 0 y 5.'; return }
  ocupado.value=true
  try {
    const resultado=await registrarNota(e.id,seleccionado.value.codigoPensum,nota)
    e.nota=resultado.nota
    mensaje.value='Nota final guardada.'
  } catch { mensaje.value='No fue posible guardar la nota.' }
  finally { ocupado.value=false }
}
</script>
<template>
  <main class="grades-page">
    <RouterLink to="/profesor/home">Volver al inicio</RouterLink>
    <h1>Historial académico</h1>
    <p>Registra la nota final. Las materias aprobadas permiten validar los prerrequisitos de matrícula.</p>
    <label>Curso <select v-model="cursoId" :disabled="ocupado" @change="cargar">
      <option :value="null">Selecciona un curso</option>
      <option v-for="c in cursos" :key="c.id" :value="c.id">{{ c.nombre }} · {{ c.codigo }}</option>
    </select></label>
    <p role="status">{{ mensaje }}</p>
    <ul>
      <li v-for="e in estudiantes" :key="e.id">
        <label>{{ e.nombre }} <input v-model.number="notas[e.id]" type="number" min="0" max="5" step="0.1" :disabled="ocupado" /></label>
        <button :disabled="ocupado" @click="guardar(e)">Guardar nota final</button>
      </li>
    </ul>
  </main>
</template>
<style scoped>
.grades-page { max-width:900px; margin:auto; padding:30px }
li { display:flex; gap:16px; align-items:center; flex-wrap:wrap; margin:16px 0 }
input,select,button { padding:8px; margin-left:10px }
ul { padding:0; list-style:none }
</style>
