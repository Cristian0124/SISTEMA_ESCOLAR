<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

withDefaults(defineProps<{
  titulo: string
  descripcion: string
  seccion?: string
  volverA?: RouteLocationRaw | null
  textoVolver?: string
}>(), {
  volverA: '/inicio',
  textoVolver: 'Volver al inicio',
})
</script>

<template>
  <RouterLink v-if="volverA" class="back-link" :to="volverA">← {{ textoVolver }}</RouterLink>
  <header class="page-heading">
    <p v-if="seccion" class="eyebrow">{{ seccion }}</p>
    <h1>{{ titulo }}</h1>
    <p class="description">{{ descripcion }}</p>
    <slot />
  </header>
</template>

<style scoped>
.back-link { display: inline-block; margin-bottom: 20px; color: var(--school-blue); font-size: 13px; text-decoration: none; }
.back-link:hover { text-decoration: underline; }
.page-heading { margin-bottom: 24px; }
.eyebrow { margin: 0 0 7px; color: #9466a0; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
h1 { margin: 0; color: var(--school-ink); font-size: clamp(24px, 4vw, 32px); }
.description { color: var(--school-muted); font-size: 14px; line-height: 1.6; }
</style>
