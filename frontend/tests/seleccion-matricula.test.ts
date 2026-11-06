import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import MatriculaView from '@/views/matriculas/MatriculaView.vue'
import { listarCursos, type Curso } from '@/api/cursos.api'
import { consultarAvancePensum, type MateriaAvance } from '@/api/pensum.api'
import { obtenerMisCreditos, type ResumenCreditos } from '@/api/creditos.api'
import { useAutenticacionStore } from '@/stores/autenticacion.store'
import { useCursosStore } from '@/stores/cursos.store'

vi.mock('@/api/cursos.api', () => ({ listarCursos: vi.fn() }))
vi.mock('@/api/pensum.api', () => ({ consultarAvancePensum: vi.fn() }))
vi.mock('@/api/creditos.api', () => ({ obtenerMisCreditos: vi.fn() }))
vi.mock('@/api/matriculas.api', () => ({ crearMatricula: vi.fn() }))
vi.mock('@/composables/useActualizacionCursos', () => ({ useActualizacionCursos: vi.fn() }))

const curso: Curso = {
  id: 1,
  codigo: '10001-01',
  codigoPensum: '10001',
  nombre: 'Programación',
  docente: 'Profesora',
  docenteId: 2,
  horario: 'Lunes 08:00 - 10:00',
  cuposTotales: 30,
  cuposDisponibles: 30,
  creditos: 4,
}

const avance: MateriaAvance = {
  codigo: '10001',
  nombre: 'Programación',
  semestre: 1,
  creditos: 4,
  prerrequisitos: [],
  requisitosPendientes: [],
  aprobada: false,
  bloqueada: false,
}

const balance: ResumenCreditos = {
  creditosPrograma: 150,
  semestre: 1,
  creditosBase: 18,
  creditosMatriculados: 0,
  creditosExtra: 0,
  creditosDisponibles: 18,
  periodo: '2026-2',
  solicitud: null,
}

let vista: VueWrapper | undefined

beforeEach(() => {
  vi.resetAllMocks()
  setActivePinia(createPinia())
  useAutenticacionStore().establecerSesion({
    accessToken: 'token',
    usuario: { id: 1, nombre: 'Estudiante', rol: 'estudiante' },
  })
  vi.mocked(listarCursos).mockResolvedValue([{ ...curso }])
  vi.mocked(consultarAvancePensum).mockResolvedValue([{ ...avance }])
  vi.mocked(obtenerMisCreditos).mockResolvedValue({ ...balance })
})

afterEach(() => { vista?.unmount() })

async function abrir() {
  vista = mount(MatriculaView, {
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  })
  await flushPromises()
  return vista
}

it('permite seleccionar un curso habilitado y muestra la selección en el resumen', async () => {
  const pantalla = await abrir()
  const casilla = pantalla.get<HTMLInputElement>('input[type="checkbox"]')

  expect(casilla.element.disabled).toBe(false)
  await casilla.setValue(true)

  expect(casilla.element.checked).toBe(true)
  expect(pantalla.get('.summary').text()).toContain('Cursos seleccionados: 1')
})

it('explica el bloqueo cuando no se ha aprobado un prerrequisito', async () => {
  vi.mocked(consultarAvancePensum).mockResolvedValue([{
    ...avance,
    prerrequisitos: ['09001'],
    requisitosPendientes: ['09001'],
    bloqueada: true,
  }])
  const pantalla = await abrir()

  expect(pantalla.get<HTMLInputElement>('input[type="checkbox"]').element.disabled).toBe(true)
  expect(pantalla.text()).toContain('Aprueba primero: 09001.')
  expect(pantalla.text()).not.toContain('Prerrequisitos cumplidos.')
})

it('permite preparar la selección si falla el saldo y ofrece reintentar su consulta', async () => {
  vi.mocked(obtenerMisCreditos).mockRejectedValueOnce(new Error('Sin conexión'))
  const pantalla = await abrir()
  const casilla = pantalla.get<HTMLInputElement>('input[type="checkbox"]')

  expect(casilla.element.disabled).toBe(false)
  expect(pantalla.text()).toContain('El servidor validará el saldo al confirmar.')
  await casilla.setValue(true)
  expect(pantalla.get('.summary').text()).toContain('Cursos seleccionados: 1')

  await pantalla.get('.credit-warning button').trigger('click')
  await flushPromises()

  expect(obtenerMisCreditos).toHaveBeenCalledTimes(2)
  expect(pantalla.get('.summary').text()).toContain('Disponibles: 18')
})

it('explica el bloqueo cuando el saldo conocido es insuficiente', async () => {
  vi.mocked(obtenerMisCreditos).mockResolvedValue({ ...balance, creditosDisponibles: 0 })
  const pantalla = await abrir()

  expect(pantalla.get<HTMLInputElement>('input[type="checkbox"]').element.disabled).toBe(true)
  expect(pantalla.text()).toContain('Este curso requiere 4 créditos y quedan 0 disponibles')
})

it('permite desmarcar un curso seleccionado aunque se agoten sus cupos al actualizar', async () => {
  const pantalla = await abrir()
  const casilla = pantalla.get<HTMLInputElement>('input[type="checkbox"]')
  await casilla.setValue(true)

  useCursosStore().cursos[0]!.cuposDisponibles = 0
  await nextTick()

  expect(casilla.element.disabled).toBe(false)
  await casilla.setValue(false)
  expect(pantalla.get('.summary').text()).toContain('Cursos seleccionados: 0')
})
