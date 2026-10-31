import type { PoolClient } from 'pg';
import { pool } from './database';

export const migraciones = [
  { archivo: '001_usuarios.sql', tabla: 'usuarios', columnas: ['cedula', 'fecha_nacimiento', 'fecha_ingreso', 'nacionalidad', 'genero'] },
  { archivo: '002_matriculas.sql', tabla: 'matriculas', columnas: [] },
  { archivo: '002_prerrequisitos_calificaciones.sql', tabla: 'materias_pensum', columnas: [], tablas: ['calificaciones', 'prerrequisitos_materia'] },
  { archivo: '003_cursos.sql', tabla: 'cursos', columnas: [] },
  { archivo: '004_cortes_calificaciones.sql', tabla: 'calificaciones', columnas: ['corte_1', 'corte_2', 'corte_3'] },
  { archivo: '005_asignacion_docentes.sql', tabla: 'cursos', columnas: ['docente_id'] },
  { archivo: '005_solicitudes_creditos.sql', tabla: 'solicitudes_creditos', columnas: [], tablas: ['matriculas'], extras: [['matriculas', 'periodo']] },
  { archivo: '006_soporte_docente.sql', tabla: 'solicitudes_soporte', columnas: [] },
  { archivo: '007_facultades_carreras.sql', tabla: 'carreras', columnas: [], tablas: ['facultades'], extras: [['usuarios', 'carrera_codigo'], ['materias_pensum', 'carrera_codigo']] },
  { archivo: '008_horarios_cursos.sql', tabla: 'curso_horarios', columnas: [] },
  { archivo: '009_sesiones_auth.sql', tabla: 'sesiones_auth', columnas: [] },
] as const;

export async function migracionesPendientes(cliente: Pick<PoolClient, 'query'> = pool): Promise<string[]> {
  const tablas = await cliente.query<{ table_name: string; column_name: string }>(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()`
  );
  const existe = (tabla: string, columna?: string) => tablas.rows.some(r => r.table_name === tabla && (!columna || r.column_name === columna));
  const pendientes: string[] = [];
  for (const migracion of migraciones) {
    const adicionales = 'tablas' in migracion ? migracion.tablas : [];
    const columnas = 'extras' in migracion ? migracion.extras : [];
    if (!existe(migracion.tabla) || migracion.columnas.some(c => !existe(migracion.tabla, c))
      || adicionales.some(t => !existe(t)) || columnas.some(([t, c]) => !existe(t, c))) pendientes.push(migracion.archivo);
  }
  const funciones = await cliente.query<{ programa: boolean; horario: boolean }>(`SELECT
    to_regprocedure('materia_del_programa(character varying,integer)') IS NOT NULL AS programa,
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = to_regclass('cursos') AND tgname = 'cursos_sincronizar_horario' AND NOT tgisinternal) AS horario`);
  if (!funciones.rows[0].programa && !pendientes.includes('007_facultades_carreras.sql')) pendientes.push('007_facultades_carreras.sql');
  if (!funciones.rows[0].horario && !pendientes.includes('008_horarios_cursos.sql')) pendientes.push('008_horarios_cursos.sql');
  return pendientes;
}

export async function verificarEsquema(): Promise<void> {
  const pendientes = await migracionesPendientes();
  if (pendientes.length) throw new Error(`Base de datos incompleta. Migraciones pendientes: ${pendientes.join(', ')}. Ejecuta npm.cmd run db:migrate desde backend.`);
}
