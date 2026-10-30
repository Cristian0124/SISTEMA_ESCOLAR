import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import DocumentsView from '@/views/DocumentsView.vue'
import { consultarResumenMatricula, descargarResumenMatricula, type ResumenMatricula } from '@/api/documents.api'

vi.mock('@/api/documents.api', () => ({ consultarResumenMatricula: vi.fn(), descargarResumenMatricula: vi.fn() }))
const resumen: ResumenMatricula = { estudiante: { id: 1, nombre: 'Estudiante', cedula: '1', carrera: 'Sistemas' },
  periodo: '2026-2', cursos: [{ codigo: 'C1', nombre: 'Materia', horario: 'Lunes 08:00 - 10:00', creditos: 3 }], totalCreditos: 3 }
let vista: VueWrapper | undefined
beforeEach(() => { vi.resetAllMocks() })
afterEach(() => { vista?.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function abrir() {
  vista = mount(DocumentsView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
  return vista
}

describe('tarjeta de resumen de matrícula', () => {
  it('muestra carga y ausencia de matrículas sin ofrecer una descarga vacía', async () => {
    let resolver!: (dato: ResumenMatricula) => void
    vi.mocked(consultarResumenMatricula).mockReturnValue(new Promise(resolve => { resolver = resolve }))
    const v = abrir()
    expect(v.text()).toContain('Consultando tu matrícula')
    resolver({ ...resumen, cursos: [], totalCreditos: 0 })
    await flushPromises()
    expect(v.text()).toContain('No tienes matrículas activas')
    expect(v.find('button').exists()).toBe(false)
  })
  it('permite reintentar una consulta fallida', async () => {
    vi.mocked(consultarResumenMatricula).mockRejectedValueOnce(new Error()).mockResolvedValueOnce(resumen)
    const v = abrir()
    await flushPromises()
    expect(v.get('[role="alert"]').text()).toContain('No fue posible consultar')
    await v.get('button').trigger('click')
    await flushPromises()
    expect(v.text()).toContain('3 créditos')
    expect(v.text()).toContain('No constituye una certificación oficial')
  })
  it('descarga el blob recibido y bloquea dobles clics mientras espera', async () => {
    vi.mocked(consultarResumenMatricula).mockResolvedValue(resumen)
    let resolver!: (pdf: Blob) => void
    vi.mocked(descargarResumenMatricula).mockReturnValue(new Promise(resolve => { resolver = resolve }))
    const crearUrl = vi.fn(() => 'blob:pdf')
    vi.stubGlobal('URL', { createObjectURL: crearUrl, revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const v = abrir()
    await flushPromises()
    await v.get('button').trigger('click')
    expect(v.get('button').attributes('disabled')).toBeDefined()
    expect(v.text()).toContain('Generando PDF')
    const pdf = new Blob(['%PDF-'], { type: 'application/pdf' })
    resolver(pdf)
    await flushPromises()
    expect(crearUrl).toHaveBeenCalledWith(pdf)
    expect(click).toHaveBeenCalledOnce()
    expect(descargarResumenMatricula).toHaveBeenCalledOnce()
  })
  it('muestra un error si falla la descarga', async () => {
    vi.mocked(consultarResumenMatricula).mockResolvedValue(resumen)
    vi.mocked(descargarResumenMatricula).mockRejectedValue(new Error())
    const v = abrir()
    await flushPromises()
    await v.get('button').trigger('click')
    await flushPromises()
    expect(v.get('[role="alert"]').text()).toContain('No fue posible descargar el PDF')
  })
})
