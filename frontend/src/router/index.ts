import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import type { RolUsuario } from '@/types'
import { useAuthStore } from '@/stores/auth'

export function createAppRouter(history: RouterHistory = createWebHistory()) {
  const router = createRouter({
    history,
    routes: [
      { path: '/login', component: () => import('../views/LoginView.vue') },
      { path: '/', component: () => import('../layouts/MainLayout.vue'), children: [
        { path: '/oferta-academica', name: 'oferta-academica', component: () => import('../views/AcademicOfferView.vue') },
        { path: '', redirect: '/inicio' },
        { path: '/home', name: 'home', meta: { roles: ['estudiante'] }, component: () => import('../views/HomeView.vue') },
        { path: '/admin/home', name: 'admin-home', component: () => import('../views/AdminHomeView.vue') },
        { path: '/profesor/home', name: 'profesor-home', component: () => import('../views/ProfessorHomeView.vue') },
        { path: '/profesor/calificaciones', name: 'profesor-calificaciones', component: () => import('../views/ProfessorGradesView.vue') },
        { path: '/profesor/horario', name: 'profesor-horario', component: () => import('../views/ProfessorScheduleView.vue') },
        { path: '/profesor/soporte', name: 'profesor-soporte', component: () => import('../views/ProfessorSupportView.vue') },
        { path: '/inicio', component: () => import('../views/HomeView.vue') },
        { path: '/status', component: () => import('../views/StatusView.vue') },
        { path: '/waiting-room', meta: { roles: ['admin'] }, component: () => import('../views/WaitingRoomView.vue') },
        { path: '/catalog', component: () => import('../views/CatalogView.vue') },
        { path: '/documentos', name: 'documentos', component: () => import('../views/DocumentsView.vue') },
        { path: '/notas-registradas', name: 'notas-registradas', component: () => import('../views/GradesView.vue') },
        { path: '/requisitos-materia', name: 'requisitos-materia', component: () => import('../views/CourseRequirementsView.vue') },
        { path: '/perfil', name: 'perfil', component: () => import('../views/PersonalDataView.vue') },
        { path: '/datos-personales', redirect: { name: 'perfil' } },
        { path: '/hoja-de-vida', name: 'hoja-de-vida', component: () => import('../views/ResumeView.vue') },
        { path: '/matricula', component: () => import('../views/MatriculaView.vue') },
        { path: '/mis-matriculas', component: () => import('../views/MyEnrollmentsView.vue') },
        { path: '/telemetria', meta: { roles: ['admin'] }, component: () => import('../views/AdminTelemetryView.vue') },
        { path: '/admin/usuarios/nuevo', name: 'registrar-usuario', component: () => import('../views/RegistrarUsuarioView.vue') },
        { path: '/admin/academico', name: 'administracion-academica', component: () => import('../views/AdminCourseAssignmentsView.vue') },
        { path: '/admin/cursos/profesores', redirect: { name: 'administracion-academica' } },
        { path: '/admin/solicitudes-creditos', name: 'solicitudes-creditos', component: () => import('../views/AdminCreditRequestsView.vue') },
        { path: '/admin/soporte-docente', name: 'admin-soporte-docente', component: () => import('../views/AdminSupportView.vue') },
        { path: '/adicion-creditos', name: 'adicion-creditos', component: () => import('../views/AdditionCreditsView.vue') },
        { path: '/schedule', component: () => import('../views/ScheduleView.vue') },
        { path: '/my-enrollments', component: () => import('../views/MyEnrollmentsView.vue') },
        { path: '/admin/telemetry', component: () => import('../views/AdminTelemetryView.vue') },
      ] },
      { path: '/:pathMatch(.*)*', redirect: '/login' },
    ],
  })

  router.beforeEach(async (to) => {
    const auth = useAuthStore()

    if (!auth.usuario && to.path !== '/login') await auth.restaurarSesion()

    if (!auth.usuario) {
      return to.path === '/login' ? true : { path: '/login' }
    }

    const inicioPorRol = auth.usuario?.rol === 'admin'
      ? 'admin-home'
      : auth.usuario?.rol === 'profesor'
        ? 'profesor-home'
        : 'home'

    const rutasProfesor = ['/profesor/home', '/profesor/calificaciones', '/profesor/horario', '/profesor/soporte']
    if (auth.usuario.rol === 'profesor' && !rutasProfesor.includes(to.path)) {
      return { name: 'profesor-home' }
    }
    if (to.path.startsWith('/profesor/') && auth.usuario.rol !== 'profesor') {
      return { name: inicioPorRol }
    }
    if (to.path.startsWith('/admin/') && auth.usuario.rol !== 'admin') {
      return { name: inicioPorRol }
    }

    const roles = to.meta.roles as RolUsuario[] | undefined
    if (roles && !roles.includes(auth.usuario.rol)) return { name: inicioPorRol }

    if (to.path === '/inicio' || (to.path === '/login' && auth.usuario)) {
      return { name: inicioPorRol }
    }
  })
  return router
}

export default createAppRouter()
