export type RolUsuario = "estudiante" | "admin";

export interface UsuarioMemoria {
  id: number;
  nombre: string;
  correo: string;
  password: string;
  rol: RolUsuario;
  cedula?: string;
  fechaNacimiento?: string;
  fechaIngreso?: string;
  nacionalidad?: string;
  genero?: string;
}

const usuarios: UsuarioMemoria[] = [
  { id: 1, nombre: "Admin", correo: "admin@escuela.edu", password: "admin123", rol: "admin" },
  { id: 2, nombre: "Estudiante", correo: "estudiante@escuela.edu", password: "est123", rol: "estudiante" }
];

export interface NuevoUsuario {
  nombre: string;
  correo: string;
  password: string;
  cedula: string;
  fechaNacimiento: string;
  fechaIngreso: string;
  nacionalidad: string;
  genero: string;
}

export function crearUsuario(datos: NuevoUsuario): UsuarioMemoria | null {
  if (usuarios.some((usuario) => usuario.correo === datos.correo.toLowerCase() || usuario.cedula === datos.cedula)) {
    return null;
  }
  const usuario: UsuarioMemoria = {
    id: Math.max(...usuarios.map((existente) => existente.id)) + 1,
    ...datos,
    correo: datos.correo.toLowerCase(),
    rol: 'estudiante',
  };
  usuarios.push(usuario);
  return usuario;
}

export function buscarUsuarioPorCorreo(correo: string): UsuarioMemoria | null {
  return usuarios.find((usuario) => usuario.correo === correo.toLowerCase()) ?? null;
}

export function buscarUsuarioPorId(id: number): UsuarioMemoria | null {
  return usuarios.find((usuario) => usuario.id === id) ?? null;
}
