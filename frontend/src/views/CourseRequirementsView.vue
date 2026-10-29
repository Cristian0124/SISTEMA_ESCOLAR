<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { consultarAvancePensum, type MateriaAvance } from '@/api/pensum.api'

const materias = ref<MateriaAvance[]>([])
const cargando = ref(true)
const error = ref('')

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    materias.value = await consultarAvancePensum()
  } catch {
    error.value = 'No fue posible consultar tus materias y prerrequisitos.'
  } finally {
    cargando.value = false
  }
}

onMounted(() => void cargar())
</script>

<template>
  <main class="requirements-page">
    <RouterLink class="back-link" to="/inicio">← Volver al inicio</RouterLink>
    <header>
      <p class="eyebrow">Proceso de matrícula académica</p>
      <h1>Consulta de requisitos de materia</h1>
      <p>Selecciona una asignatura para consultar la información disponible antes de matricularla.</p>
    </header>

    <p v-if="cargando" class="notice" role="status">Consultando asignaturas…</p>
    <section v-else-if="error" class="notice error" role="alert">
      <strong>No pudimos consultar las asignaturas</strong>
      <p>{{ error }}</p>
      <button type="button" @click="cargar">Intentar de nuevo</button>
    </section>
    <p v-else-if="!materias.length" class="notice">No hay asignaturas en el pensum.</p>
    <section v-else class="course-list" aria-label="Requisitos por asignatura">
      <article v-for="materia in materias" :key="materia.codigo" class="course-item">
        <div>
          <span>{{ materia.codigo }} · Semestre {{ materia.semestre }}</span>
          <h2>{{ materia.nombre }}</h2>
        </div>
        <div>
          <p v-if="!materia.prerrequisitosVerificados">Prerrequisitos pendientes de verificación académica.</p>
          <p v-else-if="materia.prerrequisitos.length">Requiere aprobar: {{ materia.prerrequisitos.join(', ') }}</p>
          <p v-else>Sin prerrequisitos.</p>
          <strong v-if="materia.aprobada" class="state-passed">Aprobada</strong>
          <strong v-else-if="materia.bloqueada" class="state-locked">Bloqueada · pendientes: {{ materia.requisitosPendientes.join(', ') }}</strong>
          <strong v-else-if="!materia.prerrequisitosVerificados" class="state-locked">Pendiente de validación</strong>
          <strong v-else class="state-available">Disponible</strong>
        </div>
      </article>
      <RouterLink class="catalog-link" to="/catalog">Ver oferta vigente y horarios</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.requirements-page { max-width: 1000px; margin: 0 auto; padding: 30px clamp(16px, 4vw, 42px); color: #243a3c; }
.back-link { display: inline-block; margin-bottom: 20px; color: #176d85; font-size: 13px; text-decoration: none; }
.back-link:hover { text-decoration: underline; }
.eyebrow { margin: 0 0 7px; color: #1685a2; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
h1 { margin: 0; font-size: clamp(24px, 4vw, 32px); }
header > p:last-child { color: #718083; font-size: 14px; }
.course-list { display: grid; gap: 12px; margin-top: 24px; }
.course-item, .notice { padding: 18px; border: 1px solid #dce3e3; border-radius: 8px; background: #fff; }
.course-item { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.course-item > div:last-child { display: grid; justify-items: end; gap: 5px; text-align: right; }
.course-item span { color: #176d85; font-size: 11px; font-weight: 700; }
.course-item h2 { margin: 5px 0 0; font-size: 15px; }
.course-item p, .notice p { color: #718083; font-size: 12px; line-height: 1.5; }
.course-item strong { font-size: 11px; }
.state-passed { color: #246c4a; }.state-locked { color: #925b13; }.state-available { color: #176d85; }
.catalog-link { justify-self: start; margin-top: 8px; color: #176d85; font-size: 13px; }
.error { border-color: #e8c9c5; color: #8d3028; background: #fff4f2; }
button { padding: 9px 13px; border: 1px solid #176d85; border-radius: 5px; color: #176d85; background: #fff; font: inherit; cursor: pointer; }
@media (max-width: 620px) { .course-item { align-items: flex-start; flex-direction: column; gap: 5px; } }
</style>
