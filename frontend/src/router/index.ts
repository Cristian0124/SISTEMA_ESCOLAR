import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import type { RolUsuario } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { inicioPorRol } from './inicio'

export function createAppRouter(history: RouterHistory = createWebHistory()) {
  const router = createRouter({
    history,
    routes: [
      { path: '/login', component: () => import('../views/auth/LoginView.vue') },
      { path: '/', meta: { roles: ['estudiante', 'admin'] }, component: () => import('../layouts/MainLayout.vue'), children: [
        { path: '/oferta-academica', name: 'oferta-academica', component: () => import('../views/academico/AcademicOfferView.vue') },
        { path: '', redirect: '/inicio' },
        { path: '/home', name: 'home', meta: { roles: ['estudiante'] }, component: () => import('../views/inicio/HomeView.vue') },
        { path: '/admin/home', meta: { roles: ['admin'] }, name: 'admin-home', component: () => import('../views/inicio/AdminHomeView.vue') },
        { path: '/profesor/home', meta: { roles: ['profesor'] }, name: 'profesor-home', component: () => import('../views/inicio/ProfessorHomeView.vue') },
        { path: '/profesor/calificaciones', meta: { roles: ['profesor'] }, name: 'profesor-calificaciones', component: () => import('../views/calificaciones/ProfessorGradesView.vue') },
        { path: '/profesor/horario', meta: { roles: ['profesor'] }, name: 'profesor-horario', component: () => import('../views/horarios/ProfessorScheduleView.vue') },
        { path: '/profesor/soporte', meta: { roles: ['profesor'] }, name: 'profesor-soporte', component: () => import('../views/soporte/ProfessorSupportView.vue') },
        { path: '/inicio', component: () => import('../views/inicio/HomeView.vue') },
        { path: '/catalog', component: () => import('../views/academico/CatalogView.vue') },
        { path: '/documentos', name: 'documentos', component: () => import('../views/documentos/DocumentsView.vue') },
        { path: '/notas-registradas', name: 'notas-registradas', component: () => import('../views/calificaciones/GradesView.vue') },
        { path: '/requisitos-materia', name: 'requisitos-materia', component: () => import('../views/academico/CourseRequirementsView.vue') },
        { path: '/perfil', name: 'perfil', component: () => import('../views/perfil/PersonalDataView.vue') },
        { path: '/datos-personales', redirect: { name: 'perfil' } },
        { path: '/hoja-de-vida', name: 'hoja-de-vida', component: () => import('../views/perfil/ResumeView.vue') },
        { path: '/matricula', component: () => import('../views/matriculas/MatriculaView.vue') },
        { path: '/mis-matriculas', component: () => import('../views/matriculas/MyEnrollmentsView.vue') },
        { path: '/admin/usuarios/nuevo', meta: { roles: ['admin'] }, name: 'registrar-usuario', component: () => import('../views/auth/RegistrarUsuarioView.vue') },
        { path: '/admin/academico', meta: { roles: ['admin'] }, name: 'administracion-academica', component: () => import('../views/academico/AdminCourseAssignmentsView.vue') },
        { path: '/admin/cursos/profesores', redirect: { name: 'administracion-academica' } },
        { path: '/admin/solicitudes-creditos', meta: { roles: ['admin'] }, name: 'solicitudes-creditos', component: () => import('../views/matriculas/AdminCreditRequestsView.vue') },
        { path: '/admin/soporte-docente', meta: { roles: ['admin'] }, name: 'admin-soporte-docente', component: () => import('../views/soporte/AdminSupportView.vue') },
        { path: '/adicion-creditos', name: 'adicion-creditos', component: () => import('../views/matriculas/AdditionCreditsView.vue') },
        { path: '/schedule', component: () => import('../views/horarios/ScheduleView.vue') },
        { path: '/my-enrollments', redirect: '/mis-matriculas' },
      ] },
      { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue') },
    ],
  })

  router.beforeEach(async (to) => {
    const auth = useAuthStore()

    if (!auth.usuario && to.path !== '/login') await auth.restaurarSesion()

    // La 404 es pública y no carga ninguna vista privada, incluso bajo /admin/.
    if (to.name === 'not-found') return true

    if (!auth.usuario) {
      return to.path === '/login' ? true : { path: '/login' }
    }

    const inicio = inicioPorRol(auth.usuario.rol)

    const roles = to.meta.roles as RolUsuario[] | undefined
    if (roles && !roles.includes(auth.usuario.rol)) return { name: inicio }

    if (to.path === '/inicio' || (to.path === '/login' && auth.usuario)) {
      return { name: inicio }
    }
  })
  return router
}

export default createAppRouter()
