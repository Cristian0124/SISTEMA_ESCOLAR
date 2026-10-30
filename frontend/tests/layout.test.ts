import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import App from '@/App.vue'
import { createAppRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import type { RolUsuario } from '@/types'

vi.mock('@/api/axios', () => ({ default: {
  get: vi.fn(async () => ({ data: [] })),
  post: vi.fn(async () => ({ data: {} })),
} }))

let wrapper: VueWrapper | undefined
beforeEach(() => { vi.clearAllMocks(); localStorage.clear() })
afterEach(() => { wrapper?.unmount(); wrapper = undefined })

async function abrir(rol: RolUsuario | null, ruta: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.sesionRestaurada = true
  if (rol) auth.establecerSesion({ accessToken: 'prueba', usuario: { id: 1, nombre: 'Usuario de prueba', rol } })
  const router = createAppRouter(createMemoryHistory())
  await router.push(ruta)
  await router.isReady()
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [pinia, router] } })
  await flushPromises()
  return { router, auth, vista: wrapper }
}

describe('layout y navegación por rol', () => {
  it.each([
    ['estudiante', '/home'],
    ['profesor', '/profesor/home'],
    ['admin', '/admin/home'],
    [null, '/login'],
  ] as const)('muestra la 404 para %s y permite regresar a %s', async (rol, destino) => {
    const { router, vista } = await abrir(rol, '/una-url-desconocida')
    expect(router.currentRoute.value.name).toBe('not-found')
    const titulo = vista.get('h1')
    expect(titulo.text()).toBe('Página no encontrada')
    expect(vista.get('main').attributes('aria-labelledby')).toBe(titulo.attributes('id'))
    expect(document.activeElement).toBe(titulo.element)
    expect(vista.find('.app-shell').exists()).toBe(false)
    const enlace = vista.get('a.return-link')
    expect(enlace.attributes('href')).toBe(destino)
    expect(enlace.text()).toBe(rol ? 'Volver al inicio' : 'Ir al login')
    ;(enlace.element as HTMLAnchorElement).focus()
    expect(document.activeElement).toBe(enlace.element)
    for (const ruta of ['/admin/no-existe', '/profesor/no-existe', '/no/existe?consulta=1']) {
      await router.push(ruta)
      await flushPromises()
      expect(router.currentRoute.value.name).toBe('not-found')
      expect(vista.get('h1').text()).toBe('Página no encontrada')
    }
    await vista.get('a.return-link').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe(destino))
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(destino)
    expect(vista.find('.not-found-page').exists()).toBe(false)
  })

  it.each([
    ['estudiante', '/home', '/documentos', 'Matrícula individual', 'Registrar usuarios'],
    ['admin', '/admin/home', '/oferta-academica', 'Registrar usuarios', 'Hoja de vida'],
    ['profesor', '/profesor/home', '/profesor/soporte', 'Horario docente', 'Registrar usuarios'],
  ] as const)('conserva el menú de %s al cambiar de pantalla', async (rol, inicio, destino, visible, oculto) => {
    const { router, vista } = await abrir(rol, inicio)
    const encabezado = vista.get('header.topbar').element
    expect(vista.findAll('header.topbar')).toHaveLength(1)
    expect(vista.get('aside').text()).toContain(visible)
    expect(vista.get('aside').text()).not.toContain(oculto)
    if (rol === 'estudiante') expect(vista.get('aside').text()).not.toContain('Facultades y carreras')
    await vista.get(`aside a[href="${destino}"]`).trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe(destino))
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(destino)
    expect(vista.get('header.topbar').element).toBe(encabezado)
    expect(vista.get(`aside a[href="${destino}"]`).classes()).toContain('active-link')
    expect(vista.findAll('.app-shell')).toHaveLength(1)
  })

  it('permite buscar, abrir el menú móvil y cerrarlo al navegar', async () => {
    const { vista } = await abrir('estudiante', '/home')
    await vista.get('.menu-toggle').trigger('click')
    expect(vista.get('.menu-toggle').attributes('aria-expanded')).toBe('true')
    expect(vista.get('aside').classes()).toContain('is-open')
    await vista.get('.menu-search input').setValue('ningunresultado')
    expect(vista.get('aside').text()).toContain('No hay procesos coincidentes.')
    await vista.get('.menu-search input').setValue('documentos')
    await vista.get('aside a[href="/documentos"]').trigger('click')
    await flushPromises()
    expect(vista.get('.menu-toggle').attributes('aria-expanded')).toBe('false')
    expect(vista.get('.menu-search input').element).toHaveProperty('value', '')
  })

  it('mantiene el login fuera del layout y redirige rutas privadas sin sesión', async () => {
    const { router, vista } = await abrir(null, '/documentos')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(vista.find('.app-shell').exists()).toBe(false)
    expect(vista.find('.login-page').exists()).toBe(true)
  })

  it.each([
    ['estudiante', '/admin/home', '/home'],
    ['profesor', '/catalog', '/profesor/home'],
    ['admin', '/home', '/admin/home'],
  ] as const)('redirige a %s cuando intenta entrar a otro panel', async (rol, ruta, esperado) => {
    const { router } = await abrir(rol, ruta)
    expect(router.currentRoute.value.path).toBe(esperado)
  })

  it('cierra sesión desde cualquier pantalla y elimina el layout', async () => {
    const { router, auth, vista } = await abrir('estudiante', '/documentos')
    await vista.get('.logout').trigger('click')
    await flushPromises()
    expect(auth.usuario).toBeNull()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(vista.find('.app-shell').exists()).toBe(false)
  })
})
