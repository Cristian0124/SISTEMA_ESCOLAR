export interface Curso {
  id: number;
  codigo: string;
  nombre: string;
  docente: string;
  horario: string;
  cuposTotales: number;
  cuposDisponibles: number;
}

const cursos: Curso[] = [
  { id: 1, codigo: "MAT101", nombre: "Matematica I", docente: "Ana Perez", horario: "Lun/Mie 08:00-10:00", cuposTotales: 30, cuposDisponibles: 12 },
  { id: 2, codigo: "PROG101", nombre: "Programacion I", docente: "Luis Gomez", horario: "Mar/Jue 10:00-12:00", cuposTotales: 25, cuposDisponibles: 8 },
  { id: 3, codigo: "HIS101", nombre: "Historia", docente: "Maria Lopez", horario: "Lun/Mie 13:00-15:00", cuposTotales: 35, cuposDisponibles: 17 },
  { id: 4, codigo: "FIS101", nombre: "Fisica I", docente: "Carlos Ruiz", horario: "Mar/Jue 14:00-16:00", cuposTotales: 20, cuposDisponibles: 5 }
];

export function listarCursos(): Curso[] {
  return cursos;
}