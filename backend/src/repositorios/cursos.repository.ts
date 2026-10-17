export interface Curso {
  id: number;
  codigo: string;
  nombre: string;
  docente: string;
  horario: string;
  cuposTotales: number;
  cuposDisponibles: number;
  semestre: number;
  creditos: number;
  codigoPensum: string;
}

const cursos: Curso[] = [
  { id: 1, codigo: "SIS101", codigoPensum: "ISI01", nombre: "Matemáticas fundamentales", docente: "Carlos Ramírez", horario: "Lunes 7:00 - 9:00", cuposTotales: 35, cuposDisponibles: 30, semestre: 1, creditos: 3 },
  { id: 2, codigo: "SIS102", codigoPensum: "ISI05", nombre: "Algoritmos y programación I", docente: "Laura Gómez", horario: "Martes 8:00 - 10:00", cuposTotales: 30, cuposDisponibles: 25, semestre: 1, creditos: 3 },
  { id: 3, codigo: "SIS201", codigoPensum: "ISI06", nombre: "Cálculo I", docente: "Andrés Martínez", horario: "Miércoles 7:00 - 9:00", cuposTotales: 40, cuposDisponibles: 35, semestre: 2, creditos: 3 },
  { id: 4, codigo: "SIS202", codigoPensum: "ISI08", nombre: "Álgebra lineal", docente: "Patricia Torres", horario: "Jueves 9:00 - 11:00", cuposTotales: 33, cuposDisponibles: 28, semestre: 2, creditos: 3 },
  { id: 5, codigo: "SIS301", codigoPensum: "ISI15", nombre: "Estructura de datos", docente: "Diego Herrera", horario: "Lunes 10:00 - 12:00", cuposTotales: 30, cuposDisponibles: 25, semestre: 3, creditos: 3 },
  { id: 6, codigo: "SIS302", codigoPensum: "ISI13", nombre: "Física y laboratorio II", docente: "Sandra López", horario: "Viernes 7:00 - 11:00", cuposTotales: 25, cuposDisponibles: 20, semestre: 3, creditos: 4 },
  { id: 7, codigo: "SIS401", codigoPensum: "ISI19", nombre: "Bases de datos", docente: "Felipe Castro", horario: "Martes 14:00 - 16:00", cuposTotales: 35, cuposDisponibles: 30, semestre: 4, creditos: 3 },
  { id: 8, codigo: "SIS402", codigoPensum: "ISI20", nombre: "Análisis de algoritmos", docente: "Natalia Rojas", horario: "Jueves 10:00 - 12:00", cuposTotales: 27, cuposDisponibles: 22, semestre: 4, creditos: 3 },
  { id: 9, codigo: "SIS501", codigoPensum: "ISI23", nombre: "Autómatas y lenguajes formales", docente: "Ricardo Pérez", horario: "Miércoles 14:00 - 16:00", cuposTotales: 30, cuposDisponibles: 25, semestre: 5, creditos: 3 },
  { id: 10, codigo: "SIS502", codigoPensum: "ISI24", nombre: "Ingeniería de software I", docente: "Marcela Díaz", horario: "Viernes 10:00 - 12:00", cuposTotales: 35, cuposDisponibles: 30, semestre: 5, creditos: 3 },
  { id: 11, codigo: "SIS601", codigoPensum: "ISI29", nombre: "Redes y comunicaciones", docente: "Julián Moreno", horario: "Lunes 14:00 - 16:00", cuposTotales: 29, cuposDisponibles: 24, semestre: 6, creditos: 3 },
  { id: 12, codigo: "SIS701", codigoPensum: "ISI34", nombre: "Inteligencia artificial", docente: "Carolina Vargas", horario: "Martes 16:00 - 18:00", cuposTotales: 25, cuposDisponibles: 20, semestre: 7, creditos: 3 },
  { id: 13, codigo: "SIS801", codigoPensum: "ISI40", nombre: "Computación móvil", docente: "Sebastián Ortiz", horario: "Miércoles 10:00 - 12:00", cuposTotales: 30, cuposDisponibles: 25, semestre: 8, creditos: 3 },
  { id: 14, codigo: "SIS901", codigoPensum: "ISI45", nombre: "Seguridad en redes", docente: "Valentina Ruiz", horario: "Jueves 14:00 - 16:00", cuposTotales: 25, cuposDisponibles: 20, semestre: 9, creditos: 3 },
  { id: 15, codigo: "SIS1001", codigoPensum: "ISI51", nombre: "Proyecto integrador de grado", docente: "Mauricio Sánchez", horario: "Viernes 14:00 - 16:00", cuposTotales: 20, cuposDisponibles: 15, semestre: 10, creditos: 3 }
];

export function listarCursos(): Curso[] {
  return cursos;
}
