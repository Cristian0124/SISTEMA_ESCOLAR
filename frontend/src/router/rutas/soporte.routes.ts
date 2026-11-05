import type { RouteRecordRaw } from 'vue-router'

export const rutasSoporte: RouteRecordRaw[] = [
  { path: '/profesor/soporte', meta: { roles: ['profesor'] }, name: 'profesor-soporte', component: () => import('@/views/soporte/SoporteDocenteView.vue') },
  { path: '/admin/soporte-docente', meta: { roles: ['admin'] }, name: 'admin-soporte-docente', component: () => import('@/views/soporte/SoporteAdminView.vue') },
]
