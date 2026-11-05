import type { RouteRecordRaw } from 'vue-router'

export const rutasHorarios: RouteRecordRaw[] = [
  { path: '/profesor/horario', meta: { roles: ['profesor'] }, name: 'profesor-horario', component: () => import('@/views/horarios/HorarioDocenteView.vue') },
  { path: '/schedule', component: () => import('@/views/horarios/HorarioView.vue') },
]
