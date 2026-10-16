import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: { name: 'home' } },
    { path: '/home', name: 'home', component: () => import('../views/HomeView.vue') },
    { path: '/admin/home', name: 'admin-home', component: () => import('../views/AdminHomeView.vue') },
    { path: '/inicio', redirect: { name: 'home' } },
    { path: '/login', component: () => import('../views/LoginView.vue') },
    { path: '/status', component: () => import('../views/StatusView.vue') },
    { path: '/waiting-room', component: () => import('../views/WaitingRoomView.vue') },
    { path: '/catalog', component: () => import('../views/CatalogView.vue') },
    { path: '/matricula', component: () => import('../views/MatriculaView.vue') },
    { path: '/mis-matriculas', component: () => import('../views/MyEnrollmentsView.vue') },
    { path: '/telemetria', component: () => import('../views/AdminTelemetryView.vue') },
    { path: '/admin/usuarios/nuevo', name: 'registrar-usuario', component: () => import('../views/RegistrarUsuarioView.vue') },
    { path: '/schedule', component: () => import('../views/ScheduleView.vue') },
    { path: '/my-enrollments', component: () => import('../views/MyEnrollmentsView.vue') },
    { path: '/admin/telemetry', component: () => import('../views/AdminTelemetryView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ],
})

export default router
