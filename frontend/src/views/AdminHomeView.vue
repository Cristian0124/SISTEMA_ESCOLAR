<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const iniciales = computed(() =>
  (auth.usuario?.nombre ?? 'Administrador')
    .split(' ')
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join('')
    .toUpperCase(),
)

const modulos = [
  {
    titulo: 'Registrar usuarios',
    descripcion: 'Crea cuentas de estudiantes y profesores con sus datos personales y acceso al sistema.',
    icono: '+',
    ruta: '/admin/usuarios/nuevo',
  },
  {
    titulo: 'Asignar profesores a cursos',
    descripcion: 'Vincula profesores registrados con los cursos que tienen a cargo.',
    icono: '✓',
    ruta: '/admin/cursos/profesores',
  },
  {
    titulo: 'Catálogo de cursos',
    descripcion: 'Consulta la oferta académica y los cursos disponibles.',
    icono: '▦',
    ruta: '/catalog',
  },
  {
    titulo: 'Matrículas',
    descripcion: 'Revisa los procesos y registros de matrícula.',
    icono: '▤',
    ruta: '/my-enrollments',
  },
  {
    titulo: 'Sala de espera',
    descripcion: 'Consulta el acceso de usuarios durante la matrícula.',
    icono: '◷',
    ruta: '/waiting-room',
  },
  {
    titulo: 'Telemetría',
    descripcion: 'Abre la vista de actividad y rendimiento del sistema.',
    icono: '⌁',
    ruta: '/admin/telemetry',
  },
]

async function salir() {
  await auth.cerrarSesion()
  await router.push('/login')
}
</script>

<template>
  <div class="admin-shell">
    <header class="topbar">
      <RouterLink class="brand" to="/admin/home" aria-label="Sistema Escolar, panel administrativo">
        <span class="brand-mark">SE</span>
        <span>Sistema Escolar</span>
        <span class="brand-divider"></span>
        <span class="brand-section">Administración</span>
      </RouterLink>
      <div class="topbar-user">
        <span class="role-label">Administrador</span>
        <span class="topbar-name">{{ auth.usuario?.nombre }}</span>
        <button class="logout-button" type="button" @click="salir">
          <span aria-hidden="true">⏻</span> Salir
        </button>
      </div>
    </header>

    <div class="admin-layout">
      <aside class="sidebar" aria-label="Navegación administrativa">
        <section class="admin-profile">
          <div class="avatar" aria-hidden="true">{{ iniciales }}</div>
          <div class="profile-copy">
            <strong>{{ auth.usuario?.nombre }}</strong>
            <span>Administrador del sistema</span>
          </div>
        </section>

        <p class="nav-label">ESPACIO DE TRABAJO</p>
        <nav class="admin-nav">
          <RouterLink class="nav-link active-link" to="/admin/home">
            <span aria-hidden="true">⌂</span> Resumen
          </RouterLink>
          <RouterLink class="nav-link" to="/admin/usuarios/nuevo">
            <span aria-hidden="true">+</span> Registrar usuarios
          </RouterLink>
          <RouterLink class="nav-link" to="/admin/cursos/profesores">
            <span aria-hidden="true">✓</span> Asignar profesores
          </RouterLink>
          <RouterLink class="nav-link" to="/catalog">
            <span aria-hidden="true">▦</span> Catálogo de cursos
          </RouterLink>
          <RouterLink class="nav-link" to="/my-enrollments">
            <span aria-hidden="true">▤</span> Matrículas
          </RouterLink>
          <RouterLink class="nav-link" to="/waiting-room">
            <span aria-hidden="true">◷</span> Sala de espera
          </RouterLink>
          <RouterLink class="nav-link" to="/admin/telemetry">
            <span aria-hidden="true">⌁</span> Telemetría
          </RouterLink>
        </nav>

        <div class="sidebar-bottom">
          <span class="online-dot" aria-hidden="true"></span>
          <span>Sesión administrativa activa</span>
        </div>
      </aside>

      <main class="main-content">
        <div class="home-tab"><span aria-hidden="true">⌂</span> Inicio</div>
        <section class="welcome-row">
          <div>
            <h1>Inicio administrativo</h1>
            <p class="welcome-copy">Bienvenido, {{ auth.usuario?.nombre }}. Perfil: Administrador</p>
          </div>
        </section>

        <section class="modules-section">
          <div class="section-heading">
            <h2>Procesos disponibles</h2>
          </div>

          <div class="module-list">
            <div class="module-list-header" aria-hidden="true">
              <span></span>
              <span>Proceso</span>
              <span>Descripción</span>
              <span>Acción</span>
            </div>
            <RouterLink
              v-for="modulo in modulos"
              :key="modulo.titulo"
              class="module-row"
              :to="modulo.ruta"
            >
              <span class="module-icon" aria-hidden="true">{{ modulo.icono }}</span>
              <strong>{{ modulo.titulo }}</strong>
              <span class="module-description">{{ modulo.descripcion }}</span>
              <span class="card-action">Abrir</span>
            </RouterLink>
          </div>
        </section>
      </main>
    </div>

    <footer class="statusbar">
      <span>© 2026 Sistema Escolar</span>
      <span class="status-separator">Panel administrativo</span>
      <span class="status-user">Usuario: {{ auth.usuario?.id ?? '—' }}</span>
      <span class="status-connection"><i aria-hidden="true"></i>Conectado</span>
    </footer>
  </div>
</template>

<style scoped>
.admin-shell {
  --ink: #34464d;
  --muted: #758187;
  --line: #cfd8dc;
  --green: #356f87;
  --mint: #e4eef0;
  display: grid;
  grid-template-rows: 62px minmax(0, 1fr) 34px;
  min-height: 100vh;
  color: var(--ink);
  background: #f6f7f8;
  font-family: Arial, sans-serif;
}

.topbar {
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-width: 0;
  padding: 0 14px;
  border-top: 2px solid #4b7f95;
  border-bottom: 1px solid var(--line);
  background: #fff;
}

.brand,
.topbar-user,
.logout-button {
  display: flex;
  align-items: center;
}

.brand {
  gap: 11px;
  color: var(--ink);
  font-family: Arial, sans-serif;
  font-size: 14px;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  width: 28px;
  height: 26px;
  place-items: center;
  border-radius: 0;
  color: #fff;
  background: var(--green);
  font-family: Arial, sans-serif;
  font-size: 10px;
  font-weight: 700;
}

.brand-divider {
  width: 1px;
  height: 22px;
  margin-left: 4px;
  background: var(--line);
}

.brand-section {
  color: #768782;
  font-family: Arial, sans-serif;
  font-size: 12px;
}

.topbar-user {
  gap: 13px;
  color: #566a65;
  font-size: 12px;
}

.role-label {
  padding: 4px 7px;
  border: 1px solid #d2dce0;
  border-radius: 0;
  color: #456d7d;
  background: #f1f5f6;
  font-size: 10px;
  font-weight: 700;
}

.topbar-name {
  color: var(--ink);
  font-weight: 700;
}

.logout-button {
  gap: 6px;
  min-height: 34px;
  padding: 0 0 0 13px;
  border: 0;
  border-left: 1px solid var(--line);
  color: #9d4b3e;
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}

.logout-button span {
  font-size: 16px;
}

.admin-layout {
  display: grid;
  grid-template-columns: 218px minmax(0, 1fr);
  min-height: 0;
}

.sidebar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 13px 10px 12px;
  border-right: 1px solid var(--line);
  color: #34464d;
  background: #edf1f3;
}

.admin-profile {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 4px 5px 14px;
  border-bottom: 1px solid #cfd8dc;
}

.avatar {
  display: grid;
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid #aebfc5;
  border-radius: 2px;
  color: #355968;
  background: #dce7ea;
  font-family: Arial, sans-serif;
  font-size: 13px;
}

.profile-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.profile-copy strong {
  overflow: hidden;
  color: #34464d;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-copy span {
  color: #78868c;
  font-size: 10px;
}

.nav-label {
  margin: 17px 8px 7px;
  color: #67777d;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0;
}

.admin-nav {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 34px;
  padding: 0 9px;
  border-bottom: 1px solid #e0e6e8;
  border-left: 2px solid transparent;
  border-radius: 0;
  color: #41565e;
  font-size: 11px;
  text-decoration: none;
  transition: none;
}

.nav-link > span {
  width: 16px;
  color: #397b94;
  font-size: 14px;
  text-align: center;
}

.nav-link:hover {
  color: #235a70;
  background: #e2ebee;
}

.active-link {
  border-left-color: #4b7f95;
  color: #235a70;
  background: #dce8eb;
  font-weight: 700;
}

.sidebar-bottom {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding: 10px 7px 2px;
  border-top: 1px solid #cfd8dc;
  color: #728087;
  font-size: 10px;
}

.online-dot,
.status-connection i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #75a684;
}

.main-content {
  width: min(100%, 1240px);
  margin: 0 auto;
  padding: 25px clamp(18px, 3vw, 36px) 25px;
}

.welcome-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.eyebrow {
  margin: 0 0 7px;
  color: #4e7889;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0;
}

.welcome-row h1 {
  margin: 0;
  color: #334d57;
  font-family: Arial, sans-serif;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.15;
}

.welcome-copy {
  margin: 7px 0 0;
  color: #707e84;
  font-size: 12px;
  line-height: 1.5;
}

.date-block {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 11px 14px;
  border-left: 1px solid #aebfc5;
  color: #52656c;
  background: transparent;
}

.date-block span {
  color: #81908a;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0;
}

.date-block strong {
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
}

.system-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  padding: 10px 12px;
  border: 1px solid #cbdce1;
  border-radius: 0;
  background: #eef4f6;
}

.notice-icon {
  display: grid;
  flex: 0 0 29px;
  width: 29px;
  height: 29px;
  place-items: center;
  border-radius: 0;
  color: #356f87;
  background: #dce9ed;
  font-size: 12px;
}

.system-notice strong {
  color: #3c6472;
  font-size: 12px;
}

.system-notice p {
  margin: 4px 0 0;
  color: #718087;
  font-size: 11px;
}

.system-notice > a {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  color: #356f87;
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.modules-section {
  margin-top: 23px;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 15px;
}

.section-heading .eyebrow {
  margin-bottom: 7px;
}

.section-heading h2 {
  margin: 0;
  color: #354e57;
  font-family: Arial, sans-serif;
  font-size: 17px;
  font-weight: 600;
}

.module-count {
  padding-bottom: 3px;
  color: #7b8983;
  font-size: 11px;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.module-card {
  display: flex;
  min-height: 150px;
  flex-direction: column;
  padding: 12px 13px 11px;
  border: 1px solid #cfd8dc;
  border-radius: 0;
  color: inherit;
  background: #fff;
  text-decoration: none;
  transition: none;
}

.module-card:hover {
  border-color: #7f9eaa;
  background: #f8fafb;
}

.card-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.module-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 0;
  font-size: 18px;
}

.icon-teal {
  color: #147d7a;
  background: #e0f2ee;
}

.icon-coral {
  color: #b65443;
  background: #f9e9e3;
}

.icon-gold {
  color: #956d1f;
  background: #f7efd9;
}

.icon-blue {
  color: #456a95;
  background: #e6edf6;
}

.module-category {
  color: #86938c;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.8px;
}

.module-card h3 {
  margin: 10px 0 5px;
  color: #344f59;
  font-size: 13px;
  font-weight: 700;
}

.module-card > p {
  max-width: 360px;
  margin: 0;
  color: #718087;
  font-size: 11px;
  line-height: 1.5;
}

.card-action {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: auto;
  padding-top: 10px;
  color: #356f87;
  font-size: 10px;
  font-weight: 700;
}

.admin-note {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 23px;
  color: #77848a;
  font-size: 10px;
}

.note-mark {
  display: grid;
  flex: 0 0 17px;
  width: 17px;
  height: 17px;
  place-items: center;
  border: 1px solid #b7c3c7;
  border-radius: 0;
  color: #60757d;
  font-family: Arial, sans-serif;
  font-size: 11px;
  font-style: italic;
}

.admin-note p {
  margin: 0;
}

.statusbar {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 0 17px;
  border-top: 1px solid var(--line);
  color: #748087;
  background: #fff;
  font-size: 10px;
}

.status-separator,
.status-user {
  padding-left: 12px;
  border-left: 1px solid #dce4df;
}

.status-connection {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-left: auto;
}

.status-connection i {
  display: inline-block;
}

@media (max-width: 900px) {
  .admin-layout {
    grid-template-columns: 210px minmax(0, 1fr);
  }

  .main-content {
    padding-right: 25px;
    padding-left: 25px;
  }
}

@media (max-width: 680px) {
  .admin-shell {
    grid-template-rows: auto minmax(0, 1fr) 34px;
  }

  .topbar {
    flex-wrap: wrap;
    padding: 10px 14px;
  }

  .brand {
    gap: 8px;
    font-size: 13px;
  }

  .topbar-user {
    gap: 8px;
  }

  .topbar-name {
    display: none;
  }

  .admin-layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }

  .sidebar {
    padding: 10px 12px;
  }

  .admin-profile,
  .nav-label,
  .sidebar-bottom {
    display: none;
  }

  .admin-nav {
    flex-direction: row;
    gap: 5px;
    overflow-x: auto;
  }

  .nav-link {
    flex: 0 0 auto;
    min-height: 36px;
    padding: 0 9px;
    font-size: 10px;
  }

  .main-content {
    padding: 27px 16px;
  }

  .welcome-row {
    align-items: flex-start;
  }

  .welcome-row h1 {
    font-size: 29px;
  }

  .date-block {
    max-width: 124px;
    padding: 8px;
  }

  .date-block strong {
    line-height: 1.4;
  }

  .system-notice {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .system-notice > a {
    margin-left: 41px;
  }

  .module-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .module-card {
    min-height: 170px;
  }

  .statusbar {
    gap: 8px;
    padding: 0 10px;
    font-size: 9px;
  }

  .status-user {
    display: none;
  }
}

@media (max-width: 390px) {
  .brand-divider,
  .brand-section,
  .role-label {
    display: none;
  }

  .welcome-row {
    flex-direction: column;
  }

  .date-block {
    max-width: none;
    flex-direction: row;
    align-items: center;
    gap: 9px;
    border-left-width: 2px;
  }
}

.main-content {
  width: 100%;
  margin: 0;
  padding: 10px 14px 24px;
}

.home-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  min-width: 82px;
  padding: 7px 10px;
  border: 1px solid #ccd6da;
  border-bottom-color: #fff;
  color: #31728c;
  background: #fff;
  font-size: 11px;
}

.home-tab span {
  font-size: 14px;
}

.welcome-row {
  display: block;
  padding: 15px 4px 13px;
  border-top: 1px solid #ccd6da;
  border-bottom: 1px solid #d9e0e2;
}

.welcome-row h1 {
  color: #344c55;
  font-family: Arial, sans-serif;
  font-size: 18px;
  font-weight: 600;
}

.welcome-copy {
  margin-top: 5px;
  font-size: 11px;
}

.modules-section {
  margin-top: 16px;
}

.section-heading {
  margin-bottom: 0;
  padding: 0 4px 7px;
  border-bottom: 1px solid #cfd8dc;
}

.section-heading h2 {
  color: #3e5e6b;
  font-family: Arial, sans-serif;
  font-size: 12px;
  font-weight: 700;
}

.module-list {
  border: 1px solid #d1dadd;
  border-top: 0;
  background: #fff;
}

.module-list-header,
.module-row {
  display: grid;
  grid-template-columns: 22px minmax(145px, 0.85fr) minmax(180px, 1.5fr) 52px;
  align-items: center;
  gap: 8px;
}

.module-list-header {
  min-height: 28px;
  padding: 0 9px;
  border-bottom: 1px solid #d7dfe2;
  color: #65777e;
  background: #eef2f3;
  font-size: 10px;
  font-weight: 700;
}

.module-row {
  min-height: 39px;
  padding: 5px 9px;
  border-bottom: 1px solid #e2e7e9;
  color: #344b54;
  font-size: 11px;
  text-decoration: none;
}

.module-row:last-child {
  border-bottom: 0;
}

.module-row:hover {
  background: #f2f7f8;
}

.module-row strong {
  font-size: 11px;
  font-weight: 400;
}

.module-icon {
  width: auto;
  height: auto;
  color: #2180a0;
  background: transparent;
  font-size: 13px;
}

.module-description {
  color: #718087;
  font-size: 10px;
}

.card-action {
  margin: 0;
  padding: 0;
  color: #28728c;
  font-size: 10px;
  font-weight: 400;
  text-decoration: underline;
}

@media (max-width: 680px) {
  .module-list-header,
  .module-row {
    grid-template-columns: 20px minmax(110px, 0.9fr) minmax(105px, 1.2fr) 45px;
    gap: 5px;
    padding-right: 6px;
    padding-left: 6px;
  }

  .module-list-header {
    font-size: 9px;
  }

  .module-row strong {
    font-size: 10px;
  }

  .module-description,
  .card-action {
    font-size: 9px;
  }
}

@media (max-width: 390px) {
  .module-list-header,
  .module-row {
    grid-template-columns: 18px minmax(0, 1fr) 44px;
  }

  .module-list-header span:nth-child(3),
  .module-description {
    display: none;
  }
}
</style>
