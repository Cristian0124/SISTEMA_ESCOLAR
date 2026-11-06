import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ValidacionPensumView from '@/views/academico/ValidacionPensumView.vue'
import {
  listarCarreras, consultarPrerrequisitos, guardarPrerrequisitos,
  type Carrera, type RevisionPensum,
} from '@/api/academico.api'

vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }) }))
vi.mock('@/api/academico.api', () => ({
  listarCarreras: vi.fn(), consultarPrerrequisitos: vi.fn(), guardarPrerrequisitos: vi.fn(),
}))

const carrera: Carrera = {
  codigo: 'SIV', nombre: 'Ingeniería de Sistemas', facultadCodigo: 'ING', facultad: 'Ingeniería',
  nivel: 'Pregrado', modalidad: 'Virtual', fuente: 'Referencia académica', consultadoEn: '2026-10-28',
  prerrequisitosVerificados: false, asignaturas: 2, creditos: 8,
}

const configuracion: RevisionPensum = {
  codigo: carrera.codigo,
  nombre: carrera.nombre,
  prerrequisitosVerificados: false,
  version: 'a'.repeat(64),
  asignaturas: [
    { codigo: '10001', nombre: 'Programación I', semestre: 1, creditos: 4, prerrequisitos: [] },
    { codigo: '10002', nombre: 'Programación II', semestre: 2, creditos: 4, prerrequisitos: [] },
  ],
}

let vista: VueWrapper | undefined

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(listarCarreras).mockResolvedValue([{ ...carrera }])
  vi.mocked(consultarPrerrequisitos).mockResolvedValue({
    ...configuracion,
    asignaturas: configuracion.asignaturas.map(asignatura => ({ ...asignatura, prerrequisitos: [] })),
  })
  vi.mocked(guardarPrerrequisitos).mockResolvedValue({ ...configuracion, version: 'b'.repeat(64) })
})

afterEach(() => { vista?.unmount() })

async function abrir() {
  vista = mount(ValidacionPensumView, {
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  })
  await flushPromises()
  return vista
}

it('carga las asignaturas y exige confirmar la revisión antes de validar', async () => {
  const pantalla = await abrir()
  expect(consultarPrerrequisitos).toHaveBeenCalledWith('SIV')
  expect(pantalla.findAll('.subject')).toHaveLength(2)
  expect(pantalla.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(true)

  await pantalla.get('input[type="checkbox"]').setValue(true)
  expect(pantalla.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(false)
})

it('excluye nuevos prerrequisitos posteriores y permite corregir los guardados previamente', async () => {
  vi.mocked(consultarPrerrequisitos).mockResolvedValue({
    ...configuracion,
    asignaturas: [
      { ...configuracion.asignaturas[0], prerrequisitos: ['10002'] },
      { ...configuracion.asignaturas[1], prerrequisitos: [] },
    ],
  })
  const pantalla = await abrir()
  expect(pantalla.get('[role="alert"]').text()).toContain('Programación II · Semestre 2')
  const corregir = pantalla.findAll('button').find(boton => boton.text() === 'Quitar prerrequisitos posteriores')
  expect(corregir).toBeDefined()
  await corregir!.trigger('click')

  expect(pantalla.find('[role="alert"]').exists()).toBe(false)
  expect(pantalla.findAll('select[multiple]')[0].findAll('option')).toHaveLength(0)
  expect(pantalla.text()).toContain('Hay cambios por guardar.')
})

it('edita prerrequisitos y guarda un borrador sin habilitar automáticamente el plan', async () => {
  const pantalla = await abrir()
  await pantalla.findAll('select[multiple]')[1].setValue(['10001'])
  const guardarPendiente = pantalla.findAll('button').find(boton => boton.text() === 'Guardar como pendiente')
  expect(guardarPendiente).toBeDefined()
  await guardarPendiente!.trigger('click')
  await flushPromises()

  expect(guardarPrerrequisitos).toHaveBeenCalledWith('SIV', {
    version: configuracion.version,
    asignaturas: [
      { codigo: '10001', prerrequisitos: [] },
      { codigo: '10002', prerrequisitos: ['10001'] },
    ],
    validar: false, revisionConfirmada: false,
  })
})

it('envía la confirmación explícita y muestra el plan validado al guardar', async () => {
  vi.mocked(guardarPrerrequisitos).mockResolvedValue({
    ...configuracion, version: 'b'.repeat(64), prerrequisitosVerificados: true,
  })
  const pantalla = await abrir()
  await pantalla.get('input[type="checkbox"]').setValue(true)
  await pantalla.get('form').trigger('submit')
  await flushPromises()

  expect(guardarPrerrequisitos).toHaveBeenCalledWith('SIV', expect.objectContaining({
    validar: true, revisionConfirmada: true,
  }))
  expect(pantalla.text()).toContain('Pénsum validado. Los estudiantes pueden matricular')
  expect(pantalla.text()).toContain('Estado guardado: pénsum validado.')
})

it('retira la confirmación y protege los cambios al editar una asignatura', async () => {
  const pantalla = await abrir()
  await pantalla.get('input[type="checkbox"]').setValue(true)
  await pantalla.findAll('select[multiple]')[1].setValue(['10001'])

  expect(pantalla.get<HTMLInputElement>('input[type="checkbox"]').element.checked).toBe(false)
  expect(pantalla.get<HTMLSelectElement>('.career-field select').element.disabled).toBe(true)
  expect(pantalla.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(true)
})

it('conserva la edición y muestra el conflicto si otro administrador guardó antes', async () => {
  vi.mocked(guardarPrerrequisitos).mockRejectedValue({
    isAxiosError: true,
    response: { status: 409, data: { mensaje: 'El pénsum cambió desde que lo abriste.' } },
  })
  const pantalla = await abrir()
  await pantalla.findAll('select[multiple]')[1].setValue(['10001'])
  await pantalla.get('input[type="checkbox"]').setValue(true)
  await pantalla.get('form').trigger('submit')
  await flushPromises()

  expect(pantalla.get('[role="alert"]').text()).toContain('El pénsum cambió desde que lo abriste.')
  const opciones = pantalla.findAll<HTMLSelectElement>('select[multiple]')[1].element.selectedOptions
  expect(Array.from(opciones, opcion => opcion.value)).toEqual(['10001'])
  expect(consultarPrerrequisitos).toHaveBeenCalledTimes(1)
})
