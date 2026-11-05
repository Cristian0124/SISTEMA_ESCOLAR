import type { RouteRecordRaw } from 'vue-router'

export const rutasInicio: RouteRecordRaw[] = [
  { path: '', redirect: '/inicio' },
  { path: '/home', name: 'home', meta: { roles: ['estudiante'] }, component: () => import('@/views/inicio/InicioView.vue') },
  { path: '/admin/home', meta: { roles: ['admin'] }, name: 'admin-home', component: () => import('@/views/inicio/InicioAdminView.vue') },
  { path: '/profesor/home', meta: { roles: ['profesor'] }, name: 'profesor-home', component: () => import('@/views/inicio/InicioDocenteView.vue') },
  { path: '/inicio', component: () => import('@/views/inicio/InicioView.vue') },
]
