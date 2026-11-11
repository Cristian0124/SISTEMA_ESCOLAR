import type { RouteRecordRaw } from 'vue-router'

export const rutasMatriculas: RouteRecordRaw[] = [
  { path: '/matricula', component: () => import('@/views/matriculas/MatriculaView.vue') },
  { path: '/mis-matriculas', meta: { roles: ['admin'] }, component: () => import('@/views/matriculas/MisMatriculasView.vue') },
]
