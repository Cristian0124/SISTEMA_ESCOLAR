import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import MonitoreoView from '@/views/administracion/MonitoreoView.vue'
import { consultarMetricas, type MetricasMatricula, type PruebaCargaTelemetria } from '@/api/monitoreo.api'

vi.mock('@/api/monitoreo.api',()=>({consultarMetricas:vi.fn()}))
let vista:VueWrapper | undefined
const proceso={pid:1,solicitudesHttp:5,erroresHttp:0,promedioHttpMs:10,memoriaMb:50,activoSegundos:10,
  conexionesBD:2,conexionesLibresBD:1,conexionesEnEsperaBD:0}
function prueba():PruebaCargaTelemetria {
  return {
    id:'prueba',estado:'ejecutando',estudiantes:2000,cupos:30,conexiones:128,pausaMs:0,pid:2,
    progreso:{recibidas:2000,pendientes:500,procesando:4,confirmadas:30,rechazadas:1466},
    proceso:{...proceso,pid:2,solicitudesHttp:2000},resultado:null,mensaje:null,
    iniciadaEn:'2026-11-12T12:00:00Z',actualizadaEn:'2026-11-12T12:00:02Z',terminadaEn:null,sinActualizacion:false
  }
}
function metricas(pruebas:PruebaCargaTelemetria[]=[]):MetricasMatricula {
  return {pendientes:0,procesando:0,confirmadas:0,rechazadas:0,reservas:0,workers:1,
    latenciaP95Ms:null,actualizadoEn:'2026-11-12T12:00:02Z',proceso,pruebasCarga:pruebas}
}
beforeEach(()=>{vi.resetAllMocks();vi.mocked(consultarMetricas).mockResolvedValue(metricas())})
afterEach(()=>vista?.unmount())
async function abrir() {
  vista=mount(MonitoreoView,{global:{stubs:{RouterLink:{template:'<a><slot /></a>'}}}})
  await flushPromises()
  return vista
}
it('explica cómo iniciar la prueba cuando no hay ejecuciones',async()=>{
  const pantalla=await abrir()
  expect(pantalla.get('.load-panel').text()).toContain('npm.cmd run test:carga')
  expect(pantalla.text()).toContain('Todavía no hay pruebas de carga')
})
it('muestra las métricas del proceso de carga separadas de la aplicación',async()=>{
  vi.mocked(consultarMetricas).mockResolvedValue(metricas([prueba()]))
  const pantalla=await abrir()
  expect(pantalla.get('.load-panel').text()).toContain('Proceso de carga 2')
  expect(pantalla.get('.load-panel').text()).toContain('Solicitudes HTTP 2000')
  expect(pantalla.findAll('.load-metrics dd').map(e=>e.text())).toEqual(['500','4','30','1466'])
  expect(pantalla.text()).toContain('API · proceso 1')
})
it('conserva el resultado final y deriva los totales definitivos',async()=>{
  const p=prueba()
  p.estado='completada'
  p.resultado={correcto:true,totalMs:9000,duplicadas:0,idempotente:true,
    estados:[{estado:'confirmada',cantidad:30},{estado:'rechazada',cantidad:1970}],
    latenciaHttpMs:{p50:1000,p95:2000,p99:3000},errores:{},erroresTransporte:{}}
  vi.mocked(consultarMetricas).mockResolvedValue(metricas([p]))
  const pantalla=await abrir()
  expect(pantalla.text()).toContain('2000 de 2000 solicitudes terminadas · 100 %')
  expect(pantalla.text()).toContain('Verificaciones de integridad correctas')
  expect(pantalla.findAll('.load-metrics dd').map(e=>e.text())).toEqual(['0','0','30','1970'])
})
it('avisa cuando un proceso deja de publicar métricas',async()=>{
  const p=prueba();p.sinActualizacion=true
  vi.mocked(consultarMetricas).mockResolvedValue(metricas([p]))
  const pantalla=await abrir()
  expect(pantalla.get('.load-panel').text()).toContain('La ejecución dejó de enviar métricas')
})
