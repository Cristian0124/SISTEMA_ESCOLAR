import api from './axios'

export interface NuevoUsuario {
  nombre: string
  correo: string
  password: string
  rol: 'estudiante' | 'profesor'
  cedula: string
  fechaNacimiento: string
  fechaIngreso: string
  nacionalidad: string
  genero: string
  carreraCodigo: string | null
}

export async function registrarUsuario(datos: NuevoUsuario): Promise<void> {
  await api.post('/auth/usuarios', datos)
}
