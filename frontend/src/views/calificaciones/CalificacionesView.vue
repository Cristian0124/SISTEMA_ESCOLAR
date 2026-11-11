<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listarMisCalificaciones, type CalificacionMateriaMatriculada } from '@/api/calificaciones-estudiante.api'
const materias=ref<CalificacionMateriaMatriculada[]>([])
const error=ref('')
onMounted(async () => {
  try { materias.value=await listarMisCalificaciones() }
  catch { error.value='No fue posible consultar las notas finales.' }
})
</script>
<template>
  <main style="max-width:900px;margin:auto;padding:30px">
    <RouterLink to="/inicio">Volver al inicio</RouterLink>
    <h1>Notas finales</h1>
    <p>La aprobación de materias se utiliza para verificar prerrequisitos.</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="!materias.length">Todavía no hay materias matriculadas con información de notas.</p>
    <ul><li v-for="m in materias" :key="m.matriculaId">{{ m.nombreMateria }} · {{ m.nota ?? 'Pendiente' }}</li></ul>
  </main>
</template>
