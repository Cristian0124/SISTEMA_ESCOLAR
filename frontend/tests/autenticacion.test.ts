import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAutenticacionStore } from '@/stores/autenticacion.store'
import * as servicio from '@/api/autenticacion.api'

vi.mock('@/api/autenticacion.api',()=>({login:vi.fn(),refresh:vi.fn(),logout:vi.fn()}))
beforeEach(()=>{setActivePinia(createPinia());vi.clearAllMocks()})
it.each([
  [401,'Correo o contraseña incorrectos.'],
  [503,'El servicio no está disponible temporalmente. Intenta nuevamente más tarde.'],
  [500,'Ocurrió un error en el servidor. Intenta nuevamente o contacta a soporte.'],
  [undefined,'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.'],
])('distingue el fallo de login %s',async(estado,mensaje)=>{
  vi.mocked(servicio.login).mockRejectedValueOnce({isAxiosError:true,response:estado?{status:estado}:undefined})
  const auth=useAutenticacionStore()
  expect(await auth.iniciarSesion({correo:'prueba@example.test',password:'Prueba123!'})).toBe(false)
  expect(auth.error).toBe(mensaje)
})
