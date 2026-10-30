<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { inicioPorRol } from '@/router/inicio'

const auth = useAuthStore()
const titulo = ref<HTMLHeadingElement | null>(null)
const destino = computed(() => auth.usuario ? { name: inicioPorRol(auth.usuario.rol) } : { path: '/login' })

onMounted(() => titulo.value?.focus())
</script>

<template>
  <main class="not-found-page" aria-labelledby="not-found-title">
    <section class="not-found-card">
      <p class="error-code" aria-hidden="true">404</p>
      <h1 id="not-found-title" ref="titulo" tabindex="-1">Página no encontrada</h1>
      <p class="explanation">La dirección que buscas no existe. Revisa el enlace o vuelve para continuar en el sistema.</p>
      <RouterLink class="return-link" :to="destino">{{ auth.usuario ? 'Volver al inicio' : 'Ir al login' }}</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.not-found-page { display: grid; place-items: center; min-height: 100vh; min-height: 100dvh; padding: clamp(16px, 5vw, 48px); }
.not-found-card { width: 100%; max-width: 580px; padding: clamp(24px, 6vw, 48px); border: 1px solid #dce3e3; border-radius: 12px; background: #fff; }
.error-code { margin: 0 0 12px; color: var(--school-blue); font-size: 15px; font-weight: 700; letter-spacing: .12em; }
h1 { margin: 0; color: #1e293b; font-size: clamp(26px, 5vw, 36px); line-height: 1.2; overflow-wrap: anywhere; }
.explanation { margin: 20px 0 28px; color: #536475; line-height: 1.6; }
.return-link { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 12px 20px; border-radius: 6px; background: var(--school-blue); color: #fff; font-weight: 600; text-decoration: none; }
.return-link:hover { background: var(--school-blue-dark); }
.return-link:focus-visible { outline: 3px solid var(--school-blue); outline-offset: 4px; }
</style>
