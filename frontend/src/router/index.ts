import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import type { RolUsuario } from '@/types'
import { useAutenticacionStore } from '@/stores/autenticacion.store'
import { inicioPorRol } from './inicio'
import { rutasInicio } from './rutas/inicio.routes'
import { rutasAutenticacion } from './rutas/autenticacion.routes'
import { rutasAcademico } from './rutas/academico.routes'
import { rutasMatriculas } from './rutas/matriculas.routes'
import { rutasCalificaciones } from './rutas/calificaciones.routes'
import { rutasHorarios } from './rutas/horarios.routes'

export function createAppRouter(history: RouterHistory = createWebHistory()) {
  const router = createRouter({
    history,
    routes: [
      { path: '/login', component: () => import('../views/autenticacion/LoginView.vue') },
      { path: '/', meta: { roles: ['estudiante', 'admin'] }, component: () => import('../layouts/PrincipalLayout.vue'), children: [
        ...rutasInicio,
        { path: '/admin/simulacion', meta: { roles: ['admin'] }, component: () => import('@/views/administracion/SimulacionView.vue') },
        { path: '/admin/periodos', meta: { roles: ['admin'] }, component: () => import('@/views/administracion/PeriodoView.vue') },
        { path: '/admin/monitoreo', meta: { roles: ['admin'] }, component: () => import('@/views/administracion/MonitoreoView.vue') },
        ...rutasAutenticacion,
        ...rutasAcademico,
        ...rutasMatriculas,
        ...rutasCalificaciones,
        ...rutasHorarios,
      ] },
      { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/PaginaNoEncontradaView.vue') },
    ],
  })

  router.beforeEach(async (to) => {
    const auth = useAutenticacionStore()

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
