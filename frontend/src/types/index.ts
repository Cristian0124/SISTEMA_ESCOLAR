export type RolUsuario = 'estudiante' | 'admin'

export interface Usuario {
	id: number
	nombre: string
	rol: RolUsuario
}

export interface LoginRequest {
	correo: string
	password: string
}

export interface LoginResponse {
	accessToken: string
	usuario: Usuario
}
export {}
