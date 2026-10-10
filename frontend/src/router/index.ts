import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('../views/LoginView.vue') },
    { path: '/status', component: () => import('../views/StatusView.vue') },
    { path: '/waiting-room', component: () => import('../views/WaitingRoomView.vue') },
    { path: '/catalog', component: () => import('../views/CatalogView.vue') },
    { path: '/schedule', component: () => import('../views/ScheduleView.vue') },
    { path: '/my-enrollments', component: () => import('../views/MyEnrollmentsView.vue') },
    { path: '/admin/telemetry', component: () => import('../views/AdminTelemetryView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ],
})

export default router
