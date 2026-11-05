import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import PersonalDataView from '@/views/perfil/PersonalDataView.vue'
import ResumeView from '@/views/perfil/ResumeView.vue'
import { useAuthStore } from '@/stores/auth'
import * as api from '@/api/profile.api'

vi.mock('@/api/profile.api',()=>({consultarDatos:vi.fn(),guardarDatos:vi.fn(),consultarHoja:vi.fn(),guardarHoja:vi.fn()}))
beforeEach(()=>{
  localStorage.clear();vi.resetAllMocks();setActivePinia(createPinia())
  useAuthStore().establecerSesion({accessToken:'prueba',usuario:{id:1,nombre:'Estudiante',rol:'estudiante'}})
  vi.mocked(api.consultarDatos).mockResolvedValue({nombre:'Estudiante',correo:'uno@example.test',nacionalidad:'Colombiana',ciudad:'Cali',edad:'26',semestre:'1',estudio:'Sistemas',direccion:'',telefono:'',celular:'',tipoSangre:''})
  vi.mocked(api.consultarHoja).mockResolvedValue({descripcion:'Perfil guardado',foto:'',estudios:[]})
})
const opciones={global:{stubs:{RouterLink:true}}}
it('carga y guarda datos en el servidor y mantiene campos académicos de solo lectura',async()=>{
  const vista=mount(PersonalDataView,opciones)
  try {
    await flushPromises();expect(api.consultarDatos).toHaveBeenCalledOnce()
    expect(vista.findAll('input[readonly]')).toHaveLength(3)
    await vista.get('form').trigger('submit');await flushPromises()
    expect(api.guardarDatos).toHaveBeenCalledOnce()
    expect(vista.text()).toContain('se guardaron correctamente en el servidor')
  } finally {vista.unmount()}
})
it('no muestra éxito cuando falla el guardado y conserva un borrador',async()=>{
  vi.mocked(api.guardarDatos).mockRejectedValueOnce(new Error('sin conexión'))
  const vista=mount(PersonalDataView,opciones)
  try {await flushPromises();await vista.get('form').trigger('submit');await flushPromises()
    expect(vista.find('.success').exists()).toBe(false)
    expect(localStorage.getItem('sistema-escolar:datos-personales:1')).not.toBeNull()
  } finally {vista.unmount()}
})
it('carga y guarda la hoja de vida del servidor',async()=>{
  const vista=mount(ResumeView,opciones)
  try {await flushPromises();expect((vista.get('textarea').element as HTMLTextAreaElement).value).toBe('Perfil guardado')
    await vista.get('form').trigger('submit');await flushPromises()
    expect(api.guardarHoja).toHaveBeenCalledOnce()
    expect(vista.text()).toContain('se guardó correctamente en el servidor')
  } finally {vista.unmount()}
})
