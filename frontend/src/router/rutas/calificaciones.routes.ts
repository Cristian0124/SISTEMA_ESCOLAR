import type { RouteRecordRaw } from 'vue-router'

export const rutasCalificaciones: RouteRecordRaw[] = [
  { path: '/profesor/calificaciones', meta: { roles: ['profesor'] }, name: 'profesor-calificaciones', component: () => import('@/views/calificaciones/CalificacionesDocenteView.vue') },
  { path: '/notas-registradas', name: 'notas-registradas', component: () => import('@/views/calificaciones/CalificacionesView.vue') },
]
