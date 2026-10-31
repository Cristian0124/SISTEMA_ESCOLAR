import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import * as servicio from '@/services/authService'

vi.mock('@/services/authService',()=>({login:vi.fn(),refresh:vi.fn(),logout:vi.fn()}))
beforeEach(()=>{setActivePinia(createPinia());vi.clearAllMocks()})
it.each([
  [401,'Correo o contraseña incorrectos.'],
  [503,'El servicio no está disponible temporalmente. Intenta nuevamente más tarde.'],
  [500,'Ocurrió un error en el servidor. Intenta nuevamente o contacta a soporte.'],
  [undefined,'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.'],
])('distingue el fallo de login %s',async(estado,mensaje)=>{
  vi.mocked(servicio.login).mockRejectedValueOnce({isAxiosError:true,response:estado?{status:estado}:undefined})
  const auth=useAuthStore()
  expect(await auth.iniciarSesion({correo:'prueba@example.test',password:'Prueba123!'})).toBe(false)
  expect(auth.error).toBe(mensaje)
})
