<script setup lang="ts">
withDefaults(defineProps<{
  titulo?: string
  mensaje?: string
  variante?: 'informacion' | 'error' | 'exito'
  reintentar?: boolean
  textoReintento?: string
}>(), {
  variante: 'informacion',
  reintentar: false,
  textoReintento: 'Reintentar',
})

defineEmits<{ reintentar: [] }>()
</script>

<template>
  <section class="notice" :class="variante" :role="variante === 'error' ? 'alert' : 'status'">
    <strong v-if="titulo">{{ titulo }}</strong>
    <p v-if="mensaje">{{ mensaje }}</p>
    <slot />
    <button v-if="reintentar" type="button" @click="$emit('reintentar')">{{ textoReintento }}</button>
  </section>
</template>

<style scoped>
.notice { margin-top: 20px; padding: 22px; border: 1px solid var(--school-border); border-radius: 8px; background: var(--school-surface); }
p { margin: 8px 0; color: var(--school-muted); font-size: 13px; line-height: 1.6; }
.error { color: #8d3028; border-color: #e8c9c5; background: #fff4f2; }
.error p { color: inherit; }
.exito { color: #426a50; background: #edf3e9; }
button { margin-top: 8px; padding: 9px 13px; border: 1px solid var(--school-blue); border-radius: 5px; color: var(--school-blue); background: var(--school-surface); font: inherit; cursor: pointer; }
</style>
