<script setup lang="ts">
import type { SesionHorario } from '@/api/cursos.api'

const sesiones = defineModel<SesionHorario[]>({ required: true })
const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
</script>

<template>
  <fieldset class="sessions">
    <legend>Sesiones semanales</legend>
    <div v-for="(sesion, indice) in sesiones" :key="indice" class="session-fields">
      <label>Día
        <select v-model.number="sesion.dia" required>
          <option v-for="(dia, i) in dias" :key="dia" :value="i + 1">{{ dia }}</option>
        </select>
      </label>
      <label>Hora inicial<input v-model="sesion.horaInicio" type="time" required></label>
      <label>Hora final<input v-model="sesion.horaFin" type="time" :min="sesion.horaInicio" required></label>
      <button v-if="sesiones.length > 1" type="button" :aria-label="`Quitar sesión ${indice + 1}`"
        @click="sesiones = sesiones.filter((_, i) => i !== indice)">Quitar</button>
    </div>
    <button type="button" :disabled="sesiones.length >= 21"
      @click="sesiones = [...sesiones, { dia: 1, horaInicio: '', horaFin: '' }]">Agregar sesión</button>
  </fieldset>
</template>

<style scoped>
.sessions { grid-column: 1 / -1; margin: 0; padding: 14px; border: 1px solid var(--school-border); }
.session-fields { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; margin-bottom: 12px; }
label { display: grid; flex: 1 1 120px; gap: 6px; color: var(--school-ink); font-size: 12px; font-weight: 700; }
select, input { width: 100%; min-height: 39px; padding: 8px 10px; border: 1px solid var(--school-border); border-radius: 4px; background: var(--school-surface); color: var(--school-ink); font: inherit; font-size: 12px; }
button { min-height: 36px; padding: 0 12px; border: 1px solid var(--school-blue); border-radius: 4px; color: white; background: var(--school-blue); font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: .55; }
</style>
