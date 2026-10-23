<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const busqueda = ref('')
const idioma = ref('Español')

const gruposMenu = [
  {
    titulo: 'Proceso de Administración',
    opciones: [
      { texto: 'Actualización de datos personales', icono: '▤', ruta: '/perfil' },
      { texto: 'Hoja de vida', icono: '▤', ruta: '/hoja-de-vida' },
      { texto: 'Consulta de documentos', icono: '▤', ruta: '/documentos' },
    ],
  },
  {
    titulo: 'Proceso Novedades Académicas',
    opciones: [
      { texto: 'Adición de créditos', icono: '◉', ruta: '/adicion-creditos' },
    ],
  },
  {
    titulo: 'Proceso Matrícula Académica',
    opciones: [
      { texto: 'Consulta de requisitos de materia', icono: '▤', ruta: '/requisitos-materia' },
      { texto: 'Matrícula individual', icono: '▤', ruta: '/matricula' },
    ],
  },
  {
    titulo: 'Favoritos',
    opciones: [
      { texto: 'Notas registradas', icono: '▤', ruta: '/notas-registradas' },
      { texto: 'Matrícula individual', icono: '▤', ruta: '/matricula' },
      { texto: 'Horario del estudiante', icono: '▤', ruta: '/schedule' },
    ],
  },
  {
    titulo: 'Administración',
    opciones: [
      { texto: 'Registrar usuario', icono: '+', ruta: '/admin/usuarios/nuevo', soloAdmin: true },
    ],
  },
]

const gruposVisibles = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase()
  return gruposMenu
    .map((grupo) => ({
      ...grupo,
      opciones: grupo.opciones.filter((opcion) =>
        (!('soloAdmin' in opcion) || auth.usuario?.rol === 'admin') &&
        (!termino || opcion.texto.toLocaleLowerCase().includes(termino)),
      ),
    }))
    .filter((grupo) => grupo.opciones.length > 0)
})

const iniciales = computed(() =>
  (auth.usuario?.nombre ?? 'Estudiante')
    .split(' ')
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join('')
    .toUpperCase(),
)

async function salir() {
  await auth.cerrarSesion()
  await router.push('/login')
}
</script>

<template>
  <div class="academic-shell">
    <header class="topbar">
      <RouterLink class="brand" to="/inicio" aria-label="Sistema académico, inicio">
        <span class="brand-name">Sistema académico</span>
      </RouterLink>

      <div class="topbar-controls">
        <div class="top-control profile-control">
          <span>Perfil</span>
          <span class="profile-value">{{ auth.usuario?.rol === 'admin' ? 'Administrador' : auth.usuario?.rol === 'profesor' ? 'Profesor' : 'Estudiante' }}</span>
        </div>
        <label class="top-control language-control">
          <span>Idioma</span>
          <select v-model="idioma" aria-label="Idioma">
            <option>Español</option>
            <option>English</option>
          </select>
        </label>
        <RouterLink
          v-if="auth.usuario?.rol === 'admin'"
          class="icon-button telemetry-link"
          to="/telemetria"
          aria-label="Telemetría"
          title="Telemetría"
        >
          ◇
        </RouterLink>
        <button class="logout-button" type="button" @click="salir">
          <span aria-hidden="true">⏻</span>
          <span>Salir</span>
        </button>
      </div>
    </header>

    <div class="workspace">
      <aside class="sidebar" aria-label="Menú académico">
        <section class="student-profile">
          <div class="avatar" aria-hidden="true">{{ iniciales }}</div>
          <strong>{{ auth.usuario?.nombre ?? 'Estudiante' }}</strong>
          <span class="student-id">Código {{ auth.usuario?.id ?? '—' }}</span>
        </section>

        <label class="menu-search">
          <span class="search-icon" aria-hidden="true">⌕</span>
          <input v-model="busqueda" type="search" placeholder="Buscar proceso" aria-label="Buscar proceso" />
        </label>

        <nav class="process-menu">
          <section v-for="grupo in gruposVisibles" :key="grupo.titulo" class="menu-group">
            <h2>{{ grupo.titulo }}</h2>
            <RouterLink
              v-for="opcion in grupo.opciones"
              :key="`${grupo.titulo}-${opcion.texto}`"
              class="menu-link"
              :to="opcion.ruta"
            >
              <span class="menu-icon" aria-hidden="true">{{ opcion.icono }}</span>
              <span>{{ opcion.texto }}</span>
            </RouterLink>
          </section>
          <p v-if="gruposVisibles.length === 0" class="empty-search">No hay procesos coincidentes.</p>
        </nav>
      </aside>

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
    </div>

    <footer class="statusbar">
      <div class="status-brand" aria-hidden="true">◉</div>
      <span>© 2026 Acies</span>
      <span class="status-divider">Sistema académico</span>
      <span class="status-version">v6.0.0</span>
      <span class="status-user">Usuario: {{ auth.usuario?.id ?? '—' }}</span>
      <span class="status-connection"><i aria-hidden="true"></i>Conectado a Producción</span>
    </footer>
  </div>
</template>

<style scoped>
.academic-shell {
  --ink: #243a3c;
  --muted: #718083;
  --line: #dce3e3;
  --accent: #1685a2;
  display: grid;
  grid-template-rows: 54px minmax(0, 1fr) 34px;
  min-height: 100vh;
  color: var(--ink);
  background: #f4f7f6;
  font-family: 'Trebuchet MS', 'Aptos', sans-serif;
}

.topbar {
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  padding: 0 18px 0 14px;
  border-top: 4px solid #25454a;
  border-bottom: 1px solid var(--line);
  background: #fff;
}

.brand,
.topbar-controls,
.top-control,
.logout-button {
  display: flex;
  align-items: center;
}

.brand {
  gap: 10px;
  color: var(--ink);
  text-decoration: none;
}

.brand-name {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 16px;
}

.topbar-controls {
  gap: 14px;
  height: 100%;
}

.top-control {
  gap: 5px;
  color: #4e6265;
  font-size: 11px;
  white-space: nowrap;
}

.top-control select,
.profile-value {
  min-width: 105px;
  height: 26px;
  padding: 2px 7px;
  border: 1px solid #c7d1d2;
  border-radius: 2px;
  color: #34494b;
  background: #fff;
  font: inherit;
}

.language-control select {
  min-width: 95px;
}

.profile-value {
  display: flex;
  align-items: center;
  min-width: 105px;
  text-transform: capitalize;
}

.icon-button,
.logout-button {
  justify-content: center;
  min-width: 32px;
  height: 32px;
  border: 0;
  color: #146d83;
  background: transparent;
  text-decoration: none;
  cursor: pointer;
}

.telemetry-link {
  font-size: 21px;
}

.logout-button {
  gap: 5px;
  padding: 0 0 0 10px;
  border-left: 1px solid var(--line);
  color: #9d453c;
  font: inherit;
  font-size: 12px;
}

.logout-button span:first-child {
  font-size: 17px;
}

.workspace {
  display: grid;
  grid-template-columns: 258px minmax(0, 1fr);
  min-height: 0;
}

.sidebar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--line);
  background: #fff;
}

.student-profile {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px 13px;
  text-align: center;
}

.avatar {
  display: grid;
  width: 64px;
  height: 64px;
  margin-bottom: 8px;
  place-items: center;
  border: 2px solid #d7e4e5;
  border-radius: 50%;
  color: white;
  background: #397784;
  font-family: Georgia, serif;
  font-size: 20px;
}

.student-profile strong {
  max-width: 100%;
  color: #405458;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.45;
  text-transform: uppercase;
}

.student-id {
  margin-top: 2px;
  color: #869497;
  font-size: 10px;
}

.menu-search {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 35px;
  margin: 0 11px 9px;
  padding: 0 9px;
  border: 1px solid #cedadb;
  border-radius: 3px;
  color: #2186a0;
  background: #fbfdfd;
}

.search-icon {
  font-size: 19px;
  line-height: 1;
}

.menu-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--ink);
  background: transparent;
  font: inherit;
  font-size: 12px;
}

.menu-search input::placeholder {
  color: #849294;
}

.process-menu {
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 12px;
}

.menu-group {
  margin-bottom: 10px;
}

.menu-group h2 {
  margin: 0;
  padding: 7px 12px 6px;
  border-bottom: 1px solid #dce3e3;
  color: #176d85;
  font-size: 10px;
  font-weight: 700;
}

.menu-link {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 5px 12px;
  border-bottom: 1px solid #edf0f0;
  color: #334b4e;
  font-size: 11px;
  line-height: 1.35;
  text-decoration: none;
  transition: background-color 120ms ease, color 120ms ease;
}

.menu-link:hover,
.menu-link.router-link-active {
  color: #0d6d86;
  background: #edf7f8;
}

.menu-icon {
  flex: 0 0 13px;
  color: #1384a0;
  font-size: 13px;
  text-align: center;
}

.empty-search {
  margin: 12px;
  color: var(--muted);
  font-size: 12px;
}

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

.statusbar {
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 0 16px;
  border-top: 1px solid #d4dddd;
  color: #718083;
  background: #fff;
  font-size: 10px;
}

.status-brand {
  color: #86a933;
  font-size: 19px;
}

.status-divider,
.status-version,
.status-user {
  height: 18px;
  padding-left: 11px;
  border-left: 1px solid #d6dede;
  line-height: 18px;
}

.status-connection {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  color: #496063;
}

.status-connection i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4b9b75;
}

@media (max-width: 920px) {
  .topbar-controls {
    gap: 8px;
  }

  .workspace {
    grid-template-columns: 228px minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .academic-shell {
    grid-template-rows: auto minmax(0, 1fr) 34px;
  }

  .topbar {
    flex-wrap: wrap;
    gap: 8px;
    min-height: 54px;
    padding: 8px 12px;
  }

  .topbar-controls {
    flex: 1 1 100%;
    justify-content: flex-end;
    min-height: 30px;
  }

  .profile-control {
    display: none;
  }

  .workspace {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(330px, 1fr);
  }

  .sidebar {
    max-height: 39vh;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }

  .student-profile {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    justify-items: start;
    column-gap: 10px;
    padding: 10px 14px 8px;
    text-align: left;
  }

  .avatar {
    grid-row: span 2;
    width: 40px;
    height: 40px;
    margin: 0;
    font-size: 14px;
  }

  .student-id {
    grid-column: 2;
    margin: -8px 0 0;
  }

  .menu-search {
    min-height: 32px;
    margin-bottom: 5px;
  }

  .process-menu {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 8px;
    padding: 0 8px 6px;
  }

  .menu-group {
    margin-bottom: 5px;
  }

  .main-area {
    padding-left: 0;
  }

  .view-tab {
    margin-left: 10px;
  }

  .welcome-canvas {
    min-height: 330px;
  }

  .statusbar {
    gap: 8px;
    padding: 0 9px;
    font-size: 9px;
  }

  .status-version,
  .status-user {
    display: none;
  }
}

@media (max-width: 430px) {
  .process-menu {
    grid-template-columns: minmax(0, 1fr);
  }

  .sidebar {
    max-height: 45vh;
  }

  .status-divider {
    display: none;
  }

}
</style>
