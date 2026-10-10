import api from '@/api/axios'
import type { LoginRequest, LoginResponse } from '@/types'

export function login(datos: LoginRequest) {
  return api.post<LoginResponse>('/auth/login', datos)
}

export function refresh() {
  return api.post<LoginResponse>('/auth/refresh')
}

export function logout() {
  return api.post('/auth/logout')
}
