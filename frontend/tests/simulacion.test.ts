import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import SimulacionView from '@/views/administracion/SimulacionView.vue'
import { consultarSimulacion, iniciarSimulacion, type EstadoSimulacion } from '@/api/simulacion.api'

vi.mock('@/api/simulacion.api',()=>({consultarSimulacion:vi.fn(),iniciarSimulacion:vi.fn()}))
let vista:VueWrapper | undefined
const inicial:EstadoSimulacion={
  id:null,estado:'sin_iniciar',estudiantes:0,cupos:0,modoExposicion:true,
  progreso:null,resultado:null,mensaje:'Lista para iniciar.'
}
beforeEach(()=>{
  vi.resetAllMocks()
  vi.mocked(consultarSimulacion).mockResolvedValue({...inicial})
})
afterEach(()=>vista?.unmount())
async function abrir() {
  vista=mount(SimulacionView,{global:{stubs:{RouterLink:{template:'<a><slot /></a>'}}}})
  await flushPromises()
  return vista
}
it('explica el modo de exposición y envía la configuración del usuario',async()=>{
  vi.mocked(iniciarSimulacion).mockResolvedValue({...inicial,id:'prueba',estado:'preparando',estudiantes:2000,cupos:30})
  const pantalla=await abrir()
  expect(pantalla.text()).toContain('pausas de 40 ms')
  await pantalla.get('form').trigger('submit')
  await flushPromises()
  expect(iniciarSimulacion).toHaveBeenCalledWith({estudiantes:2000,cupos:30,modoExposicion:true})
  expect(pantalla.get<HTMLButtonElement>('button[type=submit]').element.disabled).toBe(true)
})
it('muestra reservas reales y deja las comprobaciones pendientes mientras procesa',async()=>{
  vi.mocked(consultarSimulacion).mockResolvedValue({
    ...inicial,id:'prueba',estado:'ejecutando',estudiantes:100,cupos:8,
    progreso:{fase:'ejecutando',estudiantes:100,cupos:8,enviadas:100,recibidas:100,pendientes:80,procesando:4,confirmadas:5,rechazadas:11,reservas:2,matriculas:5,transcurridoMs:1000}
  })
  const pantalla=await abrir()
  expect(pantalla.findAll('.seat.occupied')).toHaveLength(5)
  expect(pantalla.findAll('.seat.reserved')).toHaveLength(2)
  expect(pantalla.findAll('.checks .passed')).toHaveLength(0)
  expect(pantalla.text()).toContain('16 %')
})
it('muestra las verificaciones y los motivos de rechazo al finalizar',async()=>{
  vi.mocked(consultarSimulacion).mockResolvedValue({
    ...inicial,id:'prueba',estado:'completada',estudiantes:100,cupos:8,
    resultado:{estudiantes:100,cupos:8,conexionesMaximas:128,matriculas:8,duplicadas:0,idempotente:true,correcto:true,
      totalMs:4000,envioMs:1000,solicitudesPorSegundo:100,pausaDemostracionMs:40,
      latenciaHttpMs:{p50:500,p95:800,p99:900},motivosRechazo:[{codigo_error:'SIN_CUPOS',cantidad:92}],errores:{},erroresTransporte:{}}
  })
  const pantalla=await abrir()
  expect(pantalla.findAll('.checks .passed')).toHaveLength(4)
  expect(pantalla.text()).toContain('92 solicitudes rechazadas')
  expect(pantalla.text()).toContain('0.80 segundos')
})

it('muestra 99.9 % cuando termina 1999 de 2000 solicitudes',async()=>{
  vi.mocked(consultarSimulacion).mockResolvedValue({
    ...inicial,id:'prueba',estado:'ejecutando',estudiantes:2000,cupos:30,
    progreso:{fase:'ejecutando',estudiantes:2000,cupos:30,enviadas:1999,recibidas:1999,pendientes:0,procesando:0,confirmadas:30,rechazadas:1969,reservas:0,matriculas:30,transcurridoMs:10000}
  })
  const pantalla=await abrir()
  expect(pantalla.text()).toContain('99.9 %')
  expect(pantalla.text()).not.toContain('100 %')
})
