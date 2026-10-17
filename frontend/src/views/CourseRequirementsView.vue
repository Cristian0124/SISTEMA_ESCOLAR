<script setup lang="ts">
import { onMounted } from 'vue'
import { useCoursesStore } from '@/stores/courses.store'

const store = useCoursesStore()
onMounted(() => {
  if (!store.hayCursos && !store.cargando) void store.cargarCursos()
})
</script>

<template>
  <main class="requirements-page">
    <RouterLink class="back-link" to="/inicio">← Volver al inicio</RouterLink>
    <header>
      <p class="eyebrow">Proceso de matrícula académica</p>
      <h1>Consulta de requisitos de materia</h1>
      <p>Selecciona una asignatura para consultar la información disponible antes de matricularla.</p>
    </header>

    <p v-if="store.cargando" class="notice" role="status">Consultando asignaturas…</p>
    <section v-else-if="store.error" class="notice error" role="alert">
      <strong>No pudimos consultar las asignaturas</strong>
      <p>{{ store.error }}</p>
      <button type="button" @click="store.cargarCursos">Intentar de nuevo</button>
    </section>
    <p v-else-if="!store.cursos.length" class="notice">No hay asignaturas publicadas.</p>
    <section v-else class="course-list" aria-label="Requisitos por asignatura">
      <article v-for="curso in store.cursos" :key="curso.id" class="course-item">
        <div>
          <span>{{ curso.codigo }}</span>
          <h2>{{ curso.nombre }}</h2>
        </div>
        <p>El catálogo actual no informa prerrequisitos para esta asignatura.</p>
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
.course-item span { color: #176d85; font-size: 11px; font-weight: 700; }
.course-item h2 { margin: 5px 0 0; font-size: 15px; }
.course-item p, .notice p { color: #718083; font-size: 12px; line-height: 1.5; }
.catalog-link { justify-self: start; margin-top: 8px; color: #176d85; font-size: 13px; }
.error { border-color: #e8c9c5; color: #8d3028; background: #fff4f2; }
button { padding: 9px 13px; border: 1px solid #176d85; border-radius: 5px; color: #176d85; background: #fff; font: inherit; cursor: pointer; }
@media (max-width: 620px) { .course-item { align-items: flex-start; flex-direction: column; gap: 5px; } }
</style>
