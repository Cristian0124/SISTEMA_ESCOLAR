export type RolUsuario = 'estudiante' | 'profesor' | 'admin'

export interface Usuario {
	id: number
	nombre: string
	rol: RolUsuario
 carreraCodigo?: string | null
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
