import type { RouteRecordRaw } from 'vue-router'

export const rutasAutenticacion: RouteRecordRaw[] = [
  { path: '/admin/usuarios/nuevo', meta: { roles: ['admin'] }, name: 'registrar-usuario', component: () => import('@/views/autenticacion/RegistrarUsuarioView.vue') },
]
