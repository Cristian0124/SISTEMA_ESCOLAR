import type { RouteRecordRaw } from 'vue-router'

export const rutasAcademico: RouteRecordRaw[] = [
  { path: '/oferta-academica', name: 'oferta-academica', component: () => import('@/views/oferta/OfertaAcademicaView.vue') },
  { path: '/catalog', component: () => import('@/views/oferta/CatalogoView.vue') },
  { path: '/admin/academico', meta: { roles: ['admin'] }, name: 'administracion-academica', component: () => import('@/views/administracion/CursosView.vue') },
  { path: '/admin/cursos/profesores', redirect: { name: 'administracion-academica' } },
]
