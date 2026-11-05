<script setup lang="ts">
import { onMounted, ref } from 'vue'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import AvisoPagina from '@/components/ui/AvisoPagina.vue'
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
    <EncabezadoPagina titulo="Consulta de requisitos de materia" seccion="Proceso de matrícula académica"
      descripcion="Selecciona una asignatura para consultar la información disponible antes de matricularla." />

    <p v-if="cargando" class="notice" role="status">Consultando asignaturas…</p>
    <AvisoPagina v-else-if="error" variante="error" titulo="No pudimos consultar las asignaturas"
      :mensaje="error" reintentar texto-reintento="Intentar de nuevo" @reintentar="cargar" />
    <AvisoPagina v-else-if="!materias.length" mensaje="No hay asignaturas en el pensum." />
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
.requirements-page { max-width: 1000px; margin: 0 auto; padding: 30px clamp(16px, 4vw, 42px); color: var(--school-ink); }
.course-list { display: grid; gap: 12px; margin-top: 24px; }
.course-item, .notice { padding: 18px; border: 1px solid var(--school-border); border-radius: 8px; background: #fff; }
.course-item { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.course-item > div:last-child { display: grid; justify-items: end; gap: 5px; text-align: right; }
.course-item span { color: var(--school-blue); font-size: 11px; font-weight: 700; }
.course-item h2 { margin: 5px 0 0; font-size: 15px; }
.course-item p, .notice p { color: var(--school-muted); font-size: 12px; line-height: 1.5; }
.course-item strong { font-size: 11px; }
.state-passed { color: #426a50; }.state-locked { color: #8b641f; }.state-available { color: var(--school-blue); }
.catalog-link { justify-self: start; margin-top: 8px; color: var(--school-blue); font-size: 13px; }

@media (max-width: 620px) { .course-item { align-items: flex-start; flex-direction: column; gap: 5px; } }
</style>
