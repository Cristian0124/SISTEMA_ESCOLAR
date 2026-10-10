<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

async function salir() {
  await auth.cerrarSesion()
  router.push({ name: 'login' })
}
</script>

<template>
  <div>
    <header class="menu-superior">
      <nav class="secciones" aria-label="Navegación principal">
        <router-link to="/matricula">Matrícula</router-link>
        <router-link to="/mis-matriculas">Mis matrículas</router-link>
        <router-link v-if="auth.usuario?.rol === 'admin'" to="/telemetria">
          Telemetría
        </router-link>
      </nav>
      <div class="sesion">
        <span>{{ auth.usuario?.nombre }}</span>
        <button @click="salir">Cerrar sesión</button>
      </div>
    </header>

    <main>
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.menu-superior {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #20252b;
}

.secciones {
  display: flex;
  gap: 12px;
}

.secciones a {
  padding: 8px 12px;
  color: white;
  text-decoration: none;
  font-weight: bold;
  border-radius: 4px;
}

.secciones a:hover,
.secciones a.router-link-active {
  background: #454d56;
}

.sesion {
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
}
</style>
