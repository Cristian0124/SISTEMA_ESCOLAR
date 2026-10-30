import type { RolUsuario } from '@/types'

export function inicioPorRol(rol: RolUsuario) {
  return rol === 'admin' ? 'admin-home' : rol === 'profesor' ? 'profesor-home' : 'home'
}
