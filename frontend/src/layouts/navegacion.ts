export interface Acceso {
  titulo: string
  descripcion?: string
  icono: string
  ruta: string
}
export interface GrupoMenu { titulo: string; opciones: Acceso[] }

export const gruposEstudiante: GrupoMenu[] = [
  { titulo: 'Proceso de matrícula académica', opciones: [
    { titulo: 'Mi pénsum', icono: '▦', ruta: '/catalog' },
    { titulo: 'Matrícula masiva', icono: '▤', ruta: '/matricula' },
  ] },
  { titulo: 'Consultas académicas', opciones: [
    { titulo: 'Notas registradas', icono: '✓', ruta: '/notas-registradas' },
    { titulo: 'Horario del estudiante', icono: '▤', ruta: '/schedule' },
  ] },
]

export const modulosAdmin: Acceso[] = [
  { titulo:'Demostración visual', descripcion:'Observa una prueba real de estudiantes compitiendo por cupos.', icono:'▶', ruta:'/admin/simulacion' },
  { titulo:'Apertura de matrícula', descripcion:'Programa el periodo y su apertura o cierre.', icono:'◷', ruta:'/admin/periodos' },
  { titulo:'Monitoreo en vivo', descripcion:'Supervisa la cola, reservas, resultados y rendimiento.', icono:'▥', ruta:'/admin/monitoreo' },
  { titulo: 'Facultades y carreras', descripcion: 'Consulta las carreras y sus planes de estudio.', icono: '▦', ruta: '/oferta-academica' },
  {
    titulo: 'Registrar usuarios',
    descripcion: 'Crea cuentas de estudiantes y profesores con sus datos personales y acceso al sistema.',
    icono: '+',
    ruta: '/admin/usuarios/nuevo',
  },
  {
    titulo: 'Administración académica',
    descripcion: 'Crea grupos desde los pensums por facultad y carrera y asígnalos a profesores activos.',
    icono: '✓',
    ruta: '/admin/academico',
  },
  {
    titulo: 'Matrículas',
    descripcion: 'Revisa los procesos y registros de matrícula.',
    icono: '▤',
    ruta: '/mis-matriculas',
  },
]

export const accesosProfesor: Acceso[] = [
  {
    titulo: 'Registrar calificaciones',
    descripcion: 'Busca un estudiante y registra sus notas por asignatura.',
    icono: '✓',
    ruta: '/profesor/calificaciones',
  },
  {
    titulo: 'Horario docente',
    descripcion: 'Consulta el horario de tus cursos asignados.',
    icono: '▤',
    ruta: '/profesor/horario',
  },
]
