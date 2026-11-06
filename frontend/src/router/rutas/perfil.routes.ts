import type { RouteRecordRaw } from 'vue-router'

export const rutasPerfil: RouteRecordRaw[] = [
  { path: '/perfil', name: 'perfil', component: () => import('@/views/perfil/DatosPersonalesView.vue') },
  { path: '/datos-personales', redirect: { name: 'perfil' } },
]
