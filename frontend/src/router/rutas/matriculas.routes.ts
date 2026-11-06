import type { RouteRecordRaw } from 'vue-router'

export const rutasMatriculas: RouteRecordRaw[] = [
  { path: '/matricula', component: () => import('@/views/matriculas/MatriculaView.vue') },
  { path: '/mis-matriculas', meta: { roles: ['admin'] }, component: () => import('@/views/matriculas/MisMatriculasView.vue') },
  { path: '/admin/solicitudes-creditos', meta: { roles: ['admin'] }, name: 'solicitudes-creditos', component: () => import('@/views/matriculas/SolicitudesCreditosAdminView.vue') },
  { path: '/adicion-creditos', name: 'adicion-creditos', component: () => import('@/views/matriculas/AdicionCreditosView.vue') },
]
