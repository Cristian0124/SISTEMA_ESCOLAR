export interface Acceso {
  titulo: string
  descripcion?: string
  icono: string
  ruta: string
}
export interface GrupoMenu { titulo: string; opciones: Acceso[] }

export const gruposEstudiante: GrupoMenu[] = [
  { titulo: 'Proceso de Administración', opciones: [
    { titulo: 'Actualización de datos personales', icono: '▤', ruta: '/perfil' },
    { titulo: 'Hoja de vida', icono: '▤', ruta: '/hoja-de-vida' },
    { titulo: 'Consulta de documentos', icono: '▤', ruta: '/documentos' },
  ] },
  { titulo: 'Proceso Novedades Académicas', opciones: [
    { titulo: 'Adición de créditos', icono: '◉', ruta: '/adicion-creditos' },
  ] },
  { titulo: 'Proceso Matrícula Académica', opciones: [
    { titulo: 'Mi pénsum', icono: '▦', ruta: '/catalog' },
    { titulo: 'Consulta de requisitos de materia', icono: '▤', ruta: '/requisitos-materia' },
    { titulo: 'Matrícula individual', icono: '▤', ruta: '/matricula' },
    { titulo: 'Mis matrículas', icono: '▤', ruta: '/mis-matriculas' },
  ] },
  { titulo: 'Consultas académicas', opciones: [
    { titulo: 'Notas registradas', icono: '✓', ruta: '/notas-registradas' },
    { titulo: 'Horario del estudiante', icono: '▤', ruta: '/schedule' },
  ] },
]

export const modulosAdmin: Acceso[] = [
  { titulo: 'Facultades y carreras', descripcion: 'Consulta las carreras y sus planes de estudio.', icono: '▦', ruta: '/oferta-academica' },
  {
    titulo: 'Registrar usuarios',
    descripcion: 'Crea cuentas de estudiantes y profesores con sus datos personales y acceso al sistema.',
    icono: '+',
    ruta: '/admin/usuarios/nuevo',
  },
  {
    titulo: 'Asignar profesores a cursos',
    descripcion: 'Vincula profesores registrados con los cursos que tienen a cargo.',
    icono: '✓',
    ruta: '/admin/cursos/profesores',
  },
  {
    titulo: 'Solicitudes de créditos',
    descripcion: 'Revisa y decide las solicitudes de créditos adicionales enviadas por estudiantes.',
    icono: '+',
    ruta: '/admin/solicitudes-creditos',
  },
  {
    titulo: 'Soporte docente',
    descripcion: 'Lee y responde las consultas enviadas por los profesores.',
    icono: '?',
    ruta: '/admin/soporte-docente',
  },
  {
    titulo: 'Matrículas',
    descripcion: 'Revisa los procesos y registros de matrícula.',
    icono: '▤',
    ruta: '/my-enrollments',
  },
  {
    titulo: 'Sala de espera',
    descripcion: 'Consulta el acceso de usuarios durante la matrícula.',
    icono: '◷',
    ruta: '/waiting-room',
  },
  {
    titulo: 'Telemetría',
    descripcion: 'Abre la vista de actividad y rendimiento del sistema.',
    icono: '⌁',
    ruta: '/admin/telemetry',
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
  {
    titulo: 'Soporte administrativo',
    descripcion: 'Envía consultas a los administradores y revisa sus respuestas.',
    icono: '▧',
    ruta: '/profesor/soporte',
  },
]
