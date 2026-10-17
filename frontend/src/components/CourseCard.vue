<script setup lang="ts">
import type { Curso } from '@/api/courses.api'

defineProps<{ curso: Curso }>()
</script>

<template>
  <article class="course-card">
    <header class="card-header">
      <div>
        <span class="course-code">{{ curso.codigo }}</span>
        <h2>{{ curso.nombre }}</h2>
      </div>
      <span class="seats" :class="{ 'seats-low': curso.cuposDisponibles <= 5 }">
        <strong>{{ curso.cuposDisponibles }}</strong>
        <span>cupos</span>
      </span>
    </header>

    <dl class="course-details">
      <div class="detail-row">
        <dt><span aria-hidden="true">◉</span> Docente</dt>
        <dd>{{ curso.docente }}</dd>
      </div>
      <div class="detail-row">
        <dt><span aria-hidden="true">◷</span> Horario</dt>
        <dd>{{ curso.horario }}</dd>
      </div>
    </dl>

    <footer class="card-footer">
      <span>Disponibilidad</span>
      <span>{{ curso.cuposDisponibles }} de {{ curso.cuposTotales }} cupos</span>
      <div
        class="capacity-track"
        :class="{ 'capacity-track-low': curso.cuposDisponibles <= 5 }"
        role="progressbar"
        :aria-valuenow="curso.cuposDisponibles"
        :aria-valuemin="0"
        :aria-valuemax="curso.cuposTotales"
        :aria-label="`${curso.cuposDisponibles} de ${curso.cuposTotales} cupos disponibles`"
      >
        <span :style="{ width: `${curso.cuposTotales > 0 ? Math.min(100, (curso.cuposDisponibles / curso.cuposTotales) * 100) : 0}%` }"></span>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.course-card { min-width: 0; padding: 18px; border: 1px solid #e0e8e8; border-radius: 8px; background: #fff; transition: border-color 150ms ease, box-shadow 150ms ease; }
.course-card:hover { border-color: #bfd6da; box-shadow: 0 5px 16px rgb(36 58 60 / 6%); }
.card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding-bottom: 15px; border-bottom: 1px solid #edf1f1; }
.course-code { color: #176d85; font-size: 11px; font-weight: 700; letter-spacing: .08em; }
h2 { margin: 6px 0 0; color: #243a3c; font-size: 17px; line-height: 1.35; }
.seats { display: grid; flex: 0 0 auto; min-width: 54px; justify-items: center; padding: 6px 9px; border-radius: 6px; color: #246c4a; background: #eaf5ee; }
.seats strong { font-size: 17px; line-height: 1.1; }
.seats span { font-size: 10px; }
.seats-low { color: #925b13; background: #fff3dc; }
.course-details { display: grid; gap: 13px; margin: 15px 0; }
.detail-row { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 12px; font-size: 12px; line-height: 1.45; }
dt { color: #829092; }
dt span { display: inline-block; width: 16px; color: #5b929e; }
dd { margin: 0; overflow-wrap: anywhere; color: #3d5558; }
.card-footer { display: grid; grid-template-columns: 1fr auto; gap: 8px; padding-top: 12px; border-top: 1px solid #edf1f1; color: #829092; font-size: 11px; }
.card-footer > span:last-of-type { color: #536b6e; }
.capacity-track { grid-column: 1 / -1; height: 5px; overflow: hidden; border-radius: 5px; background: #eaf0f0; }
.capacity-track span { display: block; height: 100%; border-radius: inherit; background: #5b9c83; }
.capacity-track-low span { background: #d5a348; }
</style>
