<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { gruposEstudiante, modulosAdmin, accesosProfesor, type GrupoMenu } from './navigation'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const busqueda = ref('')
const menuAbierto = ref(false)
const saliendo = ref(false)
const contenido = ref<HTMLElement>()
const perfiles = {
  admin: { nombre: 'Administrador', espacio: 'Panel administrativo', inicio: '/admin/home' },
  estudiante: { nombre: 'Estudiante', espacio: 'Portal académico', inicio: '/home' },
  profesor: { nombre: 'Profesor', espacio: 'Espacio docente', inicio: '/profesor/home' },
}
const rol = computed(() => auth.usuario?.rol ?? 'estudiante')
const perfil = computed(() => perfiles[rol.value])
const iniciales = computed(() => (auth.usuario?.nombre ?? perfil.value.nombre)
  .split(' ').filter(Boolean).slice(0, 2).map(parte => parte.charAt(0)).join('').toUpperCase())
const grupos = computed<GrupoMenu[]>(() => rol.value === 'admin'
  ? [{ titulo: 'Espacio de trabajo', opciones: modulosAdmin }]
  : rol.value === 'profesor'
    ? [{ titulo: 'Procesos docentes', opciones: accesosProfesor }]
    : gruposEstudiante)
const gruposVisibles = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase()
  return grupos.value.map(grupo => ({ ...grupo,
    opciones: grupo.opciones.filter(opcion => `${opcion.titulo} ${grupo.titulo}`.toLocaleLowerCase().includes(termino)),
  })).filter(grupo => grupo.opciones.length)
})
watch(() => route.fullPath, async () => {
  menuAbierto.value = false
  busqueda.value = ''
  await nextTick()
  contenido.value?.focus({ preventScroll: true })
})
async function salir() {
  if (saliendo.value) return
  saliendo.value = true
  try { await auth.cerrarSesion(); await router.replace('/login') }
  finally { saliendo.value = false }
}
</script>

<template>
  <div class="app-shell" :class="`role-${rol}`">
    <a class="skip-link" href="#contenido-principal">Saltar al contenido</a>
    <header class="topbar">
      <RouterLink class="brand" :to="perfil.inicio">
        <span class="brand-mark" aria-hidden="true">SE</span>
        <span>Sistema académico<small>{{ perfil.espacio }}</small></span>
      </RouterLink>
      <div class="session">
        <span class="role-label">{{ perfil.nombre }}</span>
        <span class="user-name">{{ auth.usuario?.nombre }}</span>
        <button class="logout" type="button" :disabled="saliendo" @click="salir">{{ saliendo ? 'Saliendo…' : 'Salir' }}</button>
        <button class="menu-toggle" type="button" :aria-expanded="menuAbierto" aria-controls="menu-principal" @click="menuAbierto = !menuAbierto">{{ menuAbierto ? 'Cerrar menú' : 'Menú' }}</button>
      </div>
    </header>
    <div class="workspace">
      <aside id="menu-principal" class="sidebar" :class="{ 'is-open': menuAbierto }" :aria-label="`Navegación de ${perfil.nombre.toLocaleLowerCase()}`" @keydown.esc="menuAbierto = false">
        <section class="profile">
          <div class="avatar" aria-hidden="true">{{ iniciales }}</div>
          <strong>{{ auth.usuario?.nombre }}</strong>
          <span>{{ perfil.nombre }} · Código {{ auth.usuario?.id }}</span>
        </section>
        <label class="menu-search"><span>Buscar en el menú</span><input v-model="busqueda" type="search" placeholder="Buscar proceso" /></label>
        <nav aria-label="Procesos disponibles">
          <RouterLink class="nav-link" :to="perfil.inicio" exact-active-class="active-link"><span aria-hidden="true">⌂</span>Inicio</RouterLink>
          <section v-for="grupo in gruposVisibles" :key="grupo.titulo" class="menu-group">
            <h2>{{ grupo.titulo }}</h2>
            <RouterLink v-for="opcion in grupo.opciones" :key="opcion.ruta" class="nav-link" :to="opcion.ruta" exact-active-class="active-link"><span aria-hidden="true">{{ opcion.icono }}</span>{{ opcion.titulo }}</RouterLink>
          </section>
          <p v-if="!gruposVisibles.length" class="empty-search" role="status">No hay procesos coincidentes.</p>
        </nav>
      </aside>
      <div id="contenido-principal" ref="contenido" class="page-content" tabindex="-1"><RouterView /></div>
    </div>
    <footer class="statusbar"><span>Sistema académico · {{ perfil.espacio }}</span><span class="session-status"><i aria-hidden="true"></i>Sesión activa</span></footer>
  </div>
</template>

<style scoped>
.app-shell {
  --ink: #263d40;
  --muted: #728184;
  --line: #dce4e4;
  --accent: #176d85;
  --sidebar: #f1f5f4;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  color: var(--ink);
  background: #f5f7f6;
  font-family: 'Trebuchet MS', 'Aptos', sans-serif;
}

.role-estudiante {
  --ink: #1e3558;
  --muted: #6e7f96;
  --line: #dce5f0;
  --accent: #2862b2;
  --sidebar: #f1f5fb;
}

.role-admin {
  --ink: #34464d;
  --muted: #758187;
  --line: #cfd8dc;
  --accent: #356f87;
  --sidebar: #edf1f3;
  font-family: Arial, sans-serif;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  min-height: 62px;
  padding: 10px 18px;
  border-top: 3px solid var(--accent);
  border-bottom: 1px solid var(--line);
  background: #fff;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
  font-size: 15px;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  background: var(--accent);
  color: white;
  font-size: 11px;
  font-weight: bold;
}

.brand small {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font: 11px Arial, sans-serif;
}

.session {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.role-label {
  padding: 5px 8px;
  border: 1px solid var(--line);
  color: var(--accent);
  background: var(--sidebar);
}

.user-name {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

button {
  min-height: 36px;
  padding: 7px 12px;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--accent);
  background: white;
  font: inherit;
  cursor: pointer;
}

button:disabled {
  cursor: wait;
  opacity: .6;
}

.logout {
  color: #974a3e;
}

.menu-toggle {
  display: none;
}

.workspace {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  flex: 1;
}

.sidebar {
  position: sticky;
  top: 65px;
  align-self: start;
  max-height: calc(100dvh - 65px);
  overflow-y: auto;
  border-right: 1px solid var(--line);
  background: var(--sidebar);
}

.profile {
  display: grid;
  justify-items: center;
  gap: 7px;
  padding: 22px 12px;
  border-bottom: 1px solid var(--line);
}

.avatar {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 50%;
  color: white;
  background: var(--accent);
  font-size: 17px;
}

.profile strong {
  max-width: 100%;
  overflow-wrap: anywhere;
  font-size: 12px;
  text-align: center;
}

.profile > span {
  color: var(--muted);
  font-size: 10px;
}

.menu-search {
  display: grid;
  gap: 6px;
  padding: 14px 12px;
  font-size: 11px;
  color: var(--muted);
}

.menu-search input {
  width: 100%;
  min-height: 36px;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--ink);
  background: white;
  font: inherit;
}

nav {
  padding-bottom: 16px;
}

.menu-group {
  margin: 12px 0 0;
}

.menu-group h2 {
  margin: 0;
  padding: 8px 12px;
  color: var(--accent);
  font-size: 10px;
  text-transform: uppercase;
  line-height: 1.5;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 38px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--line);
  border-left: 3px solid transparent;
  color: var(--ink);
  background: #fff;
  font-size: 12px;
  line-height: 1.4;
  text-decoration: none;
}

.nav-link > span {
  flex: 0 0 16px;
  color: var(--accent);
  text-align: center;
}

.nav-link:hover {
  background: var(--sidebar);
}

.active-link {
  border-left-color: var(--accent);
  color: var(--accent);
  background: var(--sidebar);
  font-weight: bold;
}

.empty-search {
  margin: 14px;
  color: var(--muted);
  font-size: 12px;
}

.page-content {
  min-width: 0;
  background: white;
}

.page-content:focus {
  outline: none;
}

.statusbar {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 18px;
  border-top: 1px solid var(--line);
  background: #fff;
  color: var(--muted);
  font-size: 10px;
}

.session-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.session-status i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4d9a72;
}

.skip-link {
  position: fixed;
  top: -100px;
  left: 12px;
  z-index: 20;
  padding: 12px;
  color: white;
  background: var(--accent);
}

.skip-link:focus {
  top: 8px;
}

@media (max-width: 760px) {
  .topbar {
    flex-wrap: wrap;
    padding: 10px 12px;
  }

  .session {
    gap: 7px;
  }

  .role-label, .user-name {
    display: none;
  }

  .menu-toggle {
    display: block;
  }

  .workspace {
    display: block;
  }

  .sidebar {
    display: none;
    position: static;
    max-height: none;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }

  .sidebar.is-open {
    display: block;
  }

  .profile {
    display: none;
  }

  .statusbar {
    padding: 10px 12px;
  }

}

</style>
