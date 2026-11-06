import type { RouteRecordRaw } from 'vue-router'

export const rutasAcademico: RouteRecordRaw[] = [
  { path: '/oferta-academica', name: 'oferta-academica', component: () => import('@/views/academico/OfertaAcademicaView.vue') },
  { path: '/catalog', component: () => import('@/views/academico/CatalogoView.vue') },
  { path: '/admin/academico', meta: { roles: ['admin'] }, name: 'administracion-academica', component: () => import('@/views/academico/AsignacionesCursosAdminView.vue') },
  { path: '/admin/cursos/profesores', redirect: { name: 'administracion-academica' } },
]
