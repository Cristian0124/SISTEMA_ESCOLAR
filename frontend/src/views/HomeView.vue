<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
</script>

<template>
  <main class="main-area">
    <div class="view-tab"><span class="home-icon" aria-hidden="true">⌂</span>Inicio</div>
    <section class="welcome-canvas" aria-label="Inicio del sistema académico">
      <div class="welcome-content">
        <p class="welcome-eyebrow">PORTAL ACADÉMICO</p>
        <h1>Bienvenido, {{ auth.usuario?.nombre ?? 'Estudiante' }}</h1>
        <p class="welcome-description">
          Desde aquí puedes consultar la oferta académica y acceder a los procesos de tu perfil.
        </p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.main-area {
  display: grid;
  grid-template-rows: 38px minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  padding-left: 10px;
}

.view-tab {
  display: flex;
  align-items: center;
  gap: 7px;
  width: fit-content;
  min-width: 88px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-top: 0;
  border-radius: 0 0 3px 3px;
  color: #176d85;
  background: white;
  font-size: 12px;
}

.home-icon {
  font-size: 15px;
}

.welcome-canvas {
  display: flex;
  align-items: flex-start;
  min-height: 300px;
  padding: clamp(24px, 5vw, 56px);
  background: #fff;
}

.welcome-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 620px;
}

.welcome-eyebrow {
  margin: 0 0 12px;
  color: #1685a2;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.welcome-content h1 {
  margin: 0;
  color: #243a3c;
  font-size: clamp(24px, 4vw, 34px);
}

.welcome-description {
  max-width: 480px;
  margin: 12px 0 22px;
  color: #718083;
  font-size: 14px;
  line-height: 1.6;
}

@media (max-width: 720px) {
.main-area {
    padding-left: 0;
  }

.view-tab {
    margin-left: 10px;
  }

.welcome-canvas {
    min-height: 330px;
  }
}
</style>
