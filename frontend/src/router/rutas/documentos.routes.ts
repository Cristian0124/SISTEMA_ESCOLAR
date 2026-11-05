import type { RouteRecordRaw } from 'vue-router'

export const rutasDocumentos: RouteRecordRaw[] = [
  { path: '/documentos', name: 'documentos', component: () => import('@/views/documentos/DocumentosView.vue') },
]
