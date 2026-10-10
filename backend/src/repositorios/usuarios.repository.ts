export type RolUsuario = "estudiante" | "admin";

export interface UsuarioMemoria {
  id: number;
  nombre: string;
  correo: string;
  password: string;
  rol: RolUsuario;
}

const usuarios: UsuarioMemoria[] = [
  { id: 1, nombre: "Admin", correo: "admin@escuela.edu", password: "admin123", rol: "admin" },
  { id: 2, nombre: "Estudiante", correo: "estudiante@escuela.edu", password: "est123", rol: "estudiante" }
];

export function buscarUsuarioPorCorreo(correo: string): UsuarioMemoria | null {
  return usuarios.find((usuario) => usuario.correo === correo.toLowerCase()) ?? null;
}

export function buscarUsuarioPorId(id: number): UsuarioMemoria | null {
  return usuarios.find((usuario) => usuario.id === id) ?? null;
}