<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listarCursosAsignados } from '@/api/professorGrades.api'
import type { Curso } from '@/api/courses.api'

const auth = useAuthStore()
const router = useRouter()
const busqueda = ref('')
const cursosAsignados = ref<Curso[]>([])
const cargandoCursos = ref(false)
const errorCursos = ref('')

const iniciales = computed(() =>
  (auth.usuario?.nombre ?? 'Profesor')
    .split(' ')
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join('')
    .toUpperCase(),
)

const accesos = [
  {
    titulo: 'Registrar calificaciones',
    descripcion: 'Busca un estudiante y registra sus notas por asignatura.',
    icono: '✓',
    ruta: '/profesor/calificaciones',
  },
  {
    titulo: 'Datos personales',
    descripcion: 'Revisa y actualiza la información de tu perfil.',
    icono: '▤',
    ruta: '/perfil',
  },
  {
    titulo: 'Documentos',
    descripcion: 'Consulta los documentos disponibles en tu espacio académico.',
    icono: '▧',
    ruta: '/documentos',
  },
]

const accesosVisibles = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase()
  if (!termino) return accesos
  return accesos.filter((acceso) =>
    `${acceso.titulo} ${acceso.descripcion}`.toLocaleLowerCase().includes(termino),
  )
})

async function cargarCursosAsignados(): Promise<void> {
  cargandoCursos.value = true
  errorCursos.value = ''
  try {
    cursosAsignados.value = await listarCursosAsignados()
  } catch {
    errorCursos.value = 'No fue posible consultar tus cursos asignados.'
  } finally {
    cargandoCursos.value = false
  }
}

onMounted(() => void cargarCursosAsignados())

async function salir() {
  await auth.cerrarSesion()
  await router.push('/login')
}
</script>

<template>
  <div class="teacher-shell">
    <header class="topbar">
      <RouterLink class="brand" to="/profesor/home">Sistema académico</RouterLink>
      <div class="topbar-user">
        <span class="role-label">Profesor</span>
        <span class="user-name">{{ auth.usuario?.nombre }}</span>
        <button class="logout-button" type="button" @click="salir">
          <span aria-hidden="true">⏻</span> Salir
        </button>
      </div>
    </header>

    <div class="teacher-layout">
      <aside class="sidebar" aria-label="Navegación docente">
        <section class="profile">
          <div class="avatar" aria-hidden="true">{{ iniciales }}</div>
          <strong>{{ auth.usuario?.nombre }}</strong>
          <span>Perfil docente</span>
        </section>

        <label class="search-field">
          <span aria-hidden="true">⌕</span>
          <span class="visually-hidden">Buscar accesos docentes</span>
          <input v-model="busqueda" type="search" placeholder="Buscar proceso" />
        </label>

        <nav class="access-nav" aria-label="Procesos docentes">
          <p class="nav-heading">ESPACIO DOCENTE</p>
          <RouterLink
            v-for="acceso in accesosVisibles"
            :key="acceso.ruta"
            class="nav-link"
            :to="acceso.ruta"
          >
            <span aria-hidden="true">{{ acceso.icono }}</span>{{ acceso.titulo }}
          </RouterLink>
          <p v-if="!accesosVisibles.length" class="empty-search">No hay procesos coincidentes.</p>
        </nav>
      </aside>

      <main class="main-area">
        <div class="view-tab"><span aria-hidden="true">⌂</span> Inicio docente</div>
        <section class="welcome">
          <p class="eyebrow">ESPACIO DOCENTE</p>
          <h1>Bienvenido, {{ auth.usuario?.nombre ?? 'profesor' }}</h1>
          <p>Consulta tus cursos asignados y administra tu perfil.</p>
        </section>

        <section class="courses-section" aria-labelledby="courses-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">MIS CURSOS</p>
              <h2 id="courses-title">Cursos asignados</h2>
            </div>
            <button class="refresh-button" type="button" :disabled="cargandoCursos" @click="cargarCursosAsignados">
              {{ cargandoCursos ? 'Actualizando…' : 'Actualizar' }}
            </button>
          </div>

          <p v-if="cargandoCursos && !cursosAsignados.length" class="courses-notice" role="status">Cargando tus cursos…</p>
          <div v-else-if="errorCursos" class="courses-notice courses-error" role="alert">
            <span>{{ errorCursos }}</span>
            <button class="retry-button" type="button" @click="cargarCursosAsignados">Intentar de nuevo</button>
          </div>
          <p v-else-if="!cursosAsignados.length" class="courses-notice" role="status">
            Aún no tienes cursos asignados. Contacta al administrador para que te asigne cursos.
          </p>
          <div v-else class="assigned-courses">
            <article v-for="curso in cursosAsignados" :key="curso.id" class="assigned-course">
              <div class="course-heading">
                <span class="course-code">{{ curso.codigo }}</span>
                <span v-if="curso.semestre" class="course-semester">Semestre {{ curso.semestre }}</span>
              </div>
              <h3>{{ curso.nombre }}</h3>
              <dl>
                <div><dt>Horario</dt><dd>{{ curso.horario }}</dd></div>
                <div><dt>Cupos disponibles</dt><dd>{{ curso.cuposDisponibles }} de {{ curso.cuposTotales }}</dd></div>
              </dl>
              <RouterLink class="course-action" to="/profesor/calificaciones">Estudiantes y calificaciones <span aria-hidden="true">→</span></RouterLink>
            </article>
          </div>
        </section>

        <section class="access-section" aria-labelledby="access-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">ACCESOS</p>
              <h2 id="access-title">¿Qué necesitas consultar?</h2>
            </div>
            <span>{{ accesosVisibles.length }} procesos</span>
          </div>

          <div v-if="accesosVisibles.length" class="access-list">
            <RouterLink
              v-for="acceso in accesosVisibles"
              :key="acceso.ruta"
              class="access-row"
              :to="acceso.ruta"
            >
              <span class="access-icon" aria-hidden="true">{{ acceso.icono }}</span>
              <strong>{{ acceso.titulo }}</strong>
              <span class="access-description">{{ acceso.descripcion }}</span>
              <span class="access-action">Abrir <span aria-hidden="true">→</span></span>
            </RouterLink>
          </div>
          <p v-else class="empty-search">No hay accesos que coincidan con la búsqueda.</p>
        </section>
      </main>
    </div>

    <footer class="statusbar">
      <span>© 2026 Sistema académico</span>
      <span>Espacio docente</span>
      <span>Usuario: {{ auth.usuario?.id ?? '—' }}</span>
      <span class="connection"><i aria-hidden="true"></i> Sesión activa</span>
    </footer>
  </div>
</template>

<style scoped>
.teacher-shell {
  --ink: #263d40;
  --muted: #728184;
  --line: #dce4e4;
  --accent: #176d85;
  display: grid;
  grid-template-rows: 54px minmax(0, 1fr) 34px;
  min-height: 100vh;
  color: var(--ink);
  background: #f5f7f6;
  font-family: 'Trebuchet MS', 'Aptos', sans-serif;
}

.topbar, .topbar-user, .logout-button { display: flex; align-items: center; }
.topbar { justify-content: space-between; gap: 16px; padding: 0 18px; border-top: 4px solid #25454a; border-bottom: 1px solid var(--line); background: #fff; }
.brand { color: var(--ink); font-family: Georgia, 'Times New Roman', serif; font-size: 16px; text-decoration: none; }
.topbar-user { gap: 13px; min-width: 0; color: #53686b; font-size: 12px; }
.role-label { padding: 5px 8px; border: 1px solid #cfe0e2; border-radius: 3px; color: var(--accent); background: #f2f8f8; font-weight: 700; }
.user-name { overflow: hidden; max-width: 220px; color: var(--ink); font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.logout-button { gap: 6px; min-height: 32px; padding: 0 0 0 12px; border: 0; border-left: 1px solid var(--line); color: #9d453c; background: transparent; font: inherit; cursor: pointer; }
.teacher-layout { display: grid; grid-template-columns: 250px minmax(0, 1fr); min-height: 0; }
.sidebar { display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--line); background: #f1f5f4; }
.profile { display: grid; justify-items: center; gap: 6px; padding: 24px 12px 20px; border-bottom: 1px solid var(--line); }
.avatar { display: grid; width: 50px; height: 50px; place-items: center; border: 1px solid #b8d0d2; border-radius: 50%; color: #fff; background: #2f7f88; font-family: Georgia, serif; font-size: 19px; }
.profile strong { max-width: 100%; overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.profile > span { color: var(--muted); font-size: 10px; }
.search-field { display: flex; align-items: center; gap: 8px; min-height: 36px; margin: 14px 10px; padding: 0 9px; border: 1px solid #ccd9da; border-radius: 3px; color: var(--accent); background: #fff; }
.search-field input { width: 100%; min-width: 0; border: 0; outline: 0; color: var(--ink); background: transparent; font: inherit; font-size: 12px; }
.nav-heading { margin: 7px 11px; color: var(--accent); font-size: 10px; font-weight: 700; }
.nav-link { display: flex; align-items: center; gap: 9px; min-height: 38px; padding: 0 12px; border-top: 1px solid #e3e9e9; color: #30484b; background: #fff; font-size: 12px; text-decoration: none; }
.nav-link > span { color: var(--accent); }
.nav-link:hover, .access-row:hover { background: #f4f9f9; }
.empty-search { margin: 16px 12px; color: var(--muted); font-size: 12px; }
.main-area { min-width: 0; padding: 0 clamp(20px, 4vw, 52px) 44px; background: #fff; }
.view-tab { display: flex; align-items: center; gap: 8px; width: fit-content; min-height: 34px; margin-left: -16px; padding: 0 14px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); border-left: 1px solid var(--line); color: var(--accent); font-size: 11px; }
.welcome { max-width: 740px; padding: clamp(42px, 7vh, 78px) 0 45px; }
.eyebrow { margin: 0 0 9px; color: var(--accent); font-size: 10px; font-weight: 700; letter-spacing: .1em; }
h1 { margin: 0; font-size: clamp(27px, 4vw, 38px); font-weight: 600; }
.welcome > p:last-child { max-width: 590px; margin: 12px 0 0; color: var(--muted); font-size: 14px; line-height: 1.6; }
.courses-section { max-width: 980px; margin-bottom: 34px; border-top: 1px solid var(--line); }
.assigned-courses { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px; }
.assigned-course { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--line); background: #fff; }
.course-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.course-code { color: var(--accent); font-size: 10px; font-weight: 700; letter-spacing: .08em; }
.course-semester { color: var(--muted); font-size: 10px; }
.assigned-course h3 { margin: 0; font-size: 15px; }
.assigned-course dl { display: grid; gap: 8px; margin: 0; }
.assigned-course dl div { display: flex; justify-content: space-between; gap: 10px; font-size: 11px; }
.assigned-course dt { color: var(--muted); }.assigned-course dd { margin: 0; color: var(--ink); text-align: right; }
.course-action { display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid #e9eeee; color: var(--accent); font-size: 11px; font-weight: 700; text-decoration: none; }
.courses-notice { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin: 0; padding: 15px; border: 1px solid var(--line); color: var(--muted); background: #fff; font-size: 12px; }
.courses-error { border-color: #e8c9c5; color: #8d3028; background: #fff4f2; }
.refresh-button, .retry-button { min-height: 32px; padding: 0 11px; border: 1px solid #cbdada; border-radius: 4px; color: var(--accent); background: #fff; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
.refresh-button:disabled { opacity: .55; cursor: wait; }
.access-section { max-width: 980px; border-top: 1px solid var(--line); }
.section-heading { display: flex; align-items: end; justify-content: space-between; gap: 16px; padding: 22px 0 14px; }
.section-heading .eyebrow { margin-bottom: 5px; }
.section-heading h2 { margin: 0; font-size: 17px; font-weight: 600; }
.section-heading > span { color: var(--muted); font-size: 11px; }
.access-list { border: 1px solid var(--line); }
.access-row { display: grid; grid-template-columns: 42px minmax(130px, .7fr) minmax(180px, 1.4fr) 72px; align-items: center; gap: 12px; min-height: 68px; padding: 0 15px; border-bottom: 1px solid #e9eeee; color: var(--ink); text-decoration: none; }
.access-row:last-child { border-bottom: 0; }
.access-icon { display: grid; width: 32px; height: 32px; place-items: center; border: 1px solid #d4e2e3; color: var(--accent); background: #f5f9f9; }
.access-row strong { font-size: 12px; }
.access-description { color: var(--muted); font-size: 12px; line-height: 1.45; }
.access-action { justify-self: end; color: var(--accent); font-size: 11px; font-weight: 700; }
.statusbar { display: flex; align-items: center; gap: 14px; padding: 0 12px; border-top: 1px solid var(--line); color: #637477; background: #f8faf9; font-size: 10px; }
.connection { display: flex; align-items: center; gap: 5px; margin-left: auto; }
.connection i { width: 7px; height: 7px; border-radius: 50%; background: #4d9a72; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }

@media (max-width: 760px) {
  .teacher-layout { grid-template-columns: 1fr; }
  .sidebar { border-right: 0; border-bottom: 1px solid var(--line); }
  .profile { display: flex; justify-content: flex-start; padding: 12px 16px; }
  .avatar { width: 36px; height: 36px; font-size: 14px; }
  .search-field { margin: 0 12px 10px; }
  .access-nav { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 10px 10px; }
  .nav-heading { flex: 0 0 100%; }
  .nav-link { flex: 1 1 160px; border: 1px solid #e3e9e9; }
  .main-area { padding-right: 16px; padding-left: 28px; }
  .welcome { padding-top: 36px; }
  .access-row { grid-template-columns: 38px minmax(0, 1fr) 62px; gap: 9px; padding: 10px; }
  .access-description { grid-column: 2 / 3; }
  .access-action { grid-column: 3; grid-row: 1 / 3; }
  .statusbar { gap: 8px; font-size: 9px; }
}
</style>
