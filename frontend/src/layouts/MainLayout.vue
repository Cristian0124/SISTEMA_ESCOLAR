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
      <label class="menu-search"><span class="visually-hidden">Buscar en el menú</span><input v-model="busqueda" type="search" placeholder="Buscar proceso" /></label>
      <aside id="menu-principal" class="sidebar" :class="{ 'is-open': menuAbierto }" :aria-label="`Navegación de ${perfil.nombre.toLocaleLowerCase()}`" @keydown.esc="menuAbierto = false">
        <nav aria-label="Procesos disponibles">
          <RouterLink class="nav-link home-link" :to="perfil.inicio" exact-active-class="active-link"><span aria-hidden="true">⌂</span>Inicio</RouterLink>
          <section v-for="grupo in gruposVisibles" :key="grupo.titulo" class="menu-group">
            <h2>{{ grupo.titulo }}</h2>
            <RouterLink v-for="opcion in grupo.opciones" :key="opcion.ruta" class="nav-link" :to="opcion.ruta" exact-active-class="active-link"><span aria-hidden="true">{{ opcion.icono }}</span>{{ opcion.titulo }}</RouterLink>
          </section>
          <p v-if="!gruposVisibles.length" class="empty-search" role="status">No hay procesos coincidentes.</p>
        </nav>
      </aside>
      <div class="session">
        <button class="menu-toggle" type="button" :aria-expanded="menuAbierto" aria-controls="menu-principal" @click="menuAbierto = !menuAbierto">{{ menuAbierto ? 'Cerrar menú' : 'Menú' }}</button>
      </div>
    </header>
    <div class="workspace">
      <div id="contenido-principal" ref="contenido" class="page-content" tabindex="-1"><RouterView /></div>
    </div>
    <footer class="statusbar">
      <div class="user-session">
        <span class="session-avatar" aria-hidden="true">{{ iniciales }}</span>
        <span class="role-label">{{ perfil.nombre }}</span>
        <span class="user-name">{{ auth.usuario?.nombre }}</span>
        <button class="logout" type="button" :disabled="saliendo" @click="salir">{{ saliendo ? 'Saliendo…' : 'Salir' }}</button>
      </div>
      <div class="status-meta"><span>Sistema académico · {{ perfil.espacio }}</span><span class="session-status"><i aria-hidden="true"></i>Sesión activa</span></div>
    </footer>
  </div>
</template>

<style scoped>
.app-shell {
  --ink: #33213b;
  --muted: #715d78;
  --line: #e4dce4;
  --accent: #704c78;
  --sidebar: #eee5ef;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  color: var(--ink);
  background: #f5f1e9;
  font-family: 'Trebuchet MS', 'Aptos', sans-serif;
}

.role-estudiante {
  --ink: #33213b;
  --muted: #715d78;
  --line: #e4dce4;
  --accent: #704c78;
  --sidebar: #eee5ef;
}

.role-admin {
  --ink: #33213b;
  --muted: #715d78;
  --line: #e4dce4;
  --accent: #704c78;
  --sidebar: #eee5ef;
  font-family: Arial, sans-serif;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
  min-height: 68px;
  padding: 10px clamp(14px, 2vw, 28px);
  border-top: 3px solid var(--accent);
  border-bottom: 1px solid var(--line);
  background: #fff;
}

.brand {
  display: flex;
  flex: 0 0 auto;
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
  flex: 0 0 auto;
  order: 2;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.session-avatar {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: var(--accent);
  font-size: 12px;
  font-weight: 700;
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
  flex: 1;
}

.sidebar {
  display: flex;
  flex: 1 0 100%;
  order: 3;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.menu-search {
  flex: 0 1 275px;
  min-width: 180px;
  margin-left: auto;
}

.menu-search input {
  width: 100%;
  min-height: 34px;
  padding: 7px 10px;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--ink);
  background: white;
  font: inherit;
}

nav {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: nowrap;
  align-items: center;
  gap: 7px;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 5px;
  scrollbar-width: thin;
}

.menu-group {
  display: contents;
}

.menu-group h2 {
  align-self: center;
  margin: 0 2px 0 5px;
  padding: 7px 9px;
  border-radius: 4px;
  color: var(--accent);
  background: var(--sidebar);
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
  flex: 0 0 auto;
}

.nav-link {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 9px;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 4px;
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
  border-color: var(--line);
}

.active-link {
  border-color: var(--line);
  color: var(--accent);
  background: var(--sidebar);
  font-weight: bold;
}

.empty-search {
  margin: 6px;
  padding: 8px;
  color: var(--muted);
  font-size: 12px;
}

.page-content {
  min-width: 0;
  min-height: 100%;
  background: white;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

.page-content:focus {
  outline: none;
}

.statusbar {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
  padding: 12px 18px;
  border-top: 1px solid var(--line);
  background: #fff;
  color: var(--muted);
  font-size: 10px;
}

.user-session, .status-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.status-meta { margin-left: auto; }

.user-name {
  max-width: 260px;
  color: var(--ink);
  font-size: 12px;
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

  .brand { margin-right: auto; }

  .session { gap: 7px; }

  .menu-toggle {
    display: block;
  }

  .sidebar {
    display: none;
    flex: 1 0 100%;
    order: 3;
    align-items: center;
    padding: 12px 0 4px;
    border-top: 1px solid var(--line);
  }

  .sidebar nav { flex-wrap: nowrap; align-items: center; }

  .sidebar.is-open {
    display: flex;
  }

  .menu-search { flex: 0 1 190px; min-width: 130px; }
  .user-name { max-width: 170px; }
  .status-meta { margin-left: 0; }

  .statusbar {
    padding: 10px 12px;
  }

}

</style>
