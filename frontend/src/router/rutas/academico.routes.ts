import type { RouteRecordRaw } from 'vue-router'

export const rutasAcademico: RouteRecordRaw[] = [
  { path: '/oferta-academica', name: 'oferta-academica', component: () => import('@/views/academico/OfertaAcademicaView.vue') },
  { path: '/catalog', component: () => import('@/views/academico/CatalogoView.vue') },
  { path: '/requisitos-materia', name: 'requisitos-materia', component: () => import('@/views/academico/RequisitosMateriaView.vue') },
  { path: '/admin/academico', meta: { roles: ['admin'] }, name: 'administracion-academica', component: () => import('@/views/academico/AsignacionesCursosAdminView.vue') },
  { path: '/admin/pensum', meta: { roles: ['admin'] }, name: 'validacion-pensum', component: () => import('@/views/academico/ValidacionPensumView.vue') },
  { path: '/admin/cursos/profesores', redirect: { name: 'administracion-academica' } },
]
