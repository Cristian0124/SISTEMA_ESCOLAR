import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import MatriculaView from '@/views/matriculas/MatriculaView.vue'
import { listarCursos } from '@/api/cursos.api'
import { crearMatricula, listarSolicitudes } from '@/api/matriculas.api'
import { consultarPeriodo } from '@/api/monitoreo.api'
import { useAutenticacionStore } from '@/stores/autenticacion.store'

vi.mock('@/api/cursos.api', () => ({ listarCursos:vi.fn() }))
vi.mock('@/api/matriculas.api', () => ({ crearMatricula:vi.fn(),listarSolicitudes:vi.fn() }))
vi.mock('@/api/monitoreo.api', () => ({ consultarPeriodo:vi.fn() }))
let vista: VueWrapper | undefined
beforeEach(() => {
  vi.resetAllMocks()
  sessionStorage.clear()
  setActivePinia(createPinia())
  useAutenticacionStore().establecerSesion({ accessToken:'token',usuario:{ id:1,nombre:'Estudiante',rol:'estudiante' } })
  vi.mocked(listarCursos).mockResolvedValue([{id:1,codigo:'09005-01',codigoPensum:'09005',nombre:'Programación',
    docente:null,docenteId:null,horario:'Lunes 08:00 - 10:00',cuposTotales:30,cuposDisponibles:30,creditos:3}])
  vi.mocked(listarSolicitudes).mockResolvedValue([])
  vi.mocked(consultarPeriodo).mockResolvedValue({
    codigo:'2026-2',apertura:'2026-01-01T00:00:00Z',cierre:'2026-12-31T00:00:00Z',abierto:true,habilitado:true
  })
})
afterEach(() => { vista?.unmount() })
async function abrir() {
  vista=mount(MatriculaView,{global:{stubs:{RouterLink:{template:'<a><slot /></a>'}}}})
  await flushPromises()
  return vista
}
it('bloquea el envío cuando el periodo está cerrado', async () => {
  vi.mocked(consultarPeriodo).mockResolvedValue(null)
  const pantalla=await abrir()
  expect(pantalla.get<HTMLButtonElement>('article button').element.disabled).toBe(true)
})
it('envía una clave de idempotencia y muestra la solicitud en espera', async () => {
  vi.mocked(crearMatricula).mockResolvedValue({id:'solicitud',curso_id:1,estado:'en_espera',motivo:null,matricula_id:null})
  const pantalla=await abrir()
  vi.mocked(listarSolicitudes).mockResolvedValue([{
    id:'solicitud',curso_id:1,curso_codigo:'09005-01',materia:'Programación',estado:'en_espera',
    motivo:null,matricula_id:null,creada_en:new Date().toISOString()
  }])
  await pantalla.get('article button').trigger('click')
  await flushPromises()
  expect(crearMatricula).toHaveBeenCalledWith(1,expect.any(String))
  expect(pantalla.text()).toContain('en espera')
  expect(pantalla.text()).toContain('Solicitud recibida')
  expect(pantalla.get<HTMLButtonElement>('article button').element.disabled).toBe(true)
})
it('conserva la clave cuando falla el envío para poder reintentarlo', async () => {
  vi.mocked(crearMatricula).mockRejectedValue(new Error('Sin respuesta'))
  const pantalla=await abrir()
  await pantalla.get('article button').trigger('click')
  await flushPromises()
  const clave=vi.mocked(crearMatricula).mock.calls[0][1]
  await pantalla.get('article button').trigger('click')
  await flushPromises()
  expect(vi.mocked(crearMatricula).mock.calls[1][1]).toBe(clave)
})
