import type { PoolClient } from 'pg';
import { pool } from './database';

import { migraciones } from '../database/migraciones';

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
  const capacidad = await cliente.query(`SELECT character_maximum_length FROM information_schema.columns
    WHERE table_schema=current_schema() AND table_name='cursos' AND column_name='horario'`);
  if (capacidad.rows[0]?.character_maximum_length < 1000 && !pendientes.includes('010_horarios_multisesion.sql')) pendientes.push('010_horarios_multisesion.sql');
  return pendientes;
}

export async function verificarEsquema(): Promise<void> {
  const pendientes = await migracionesPendientes();
  if (pendientes.length) throw new Error(`Base de datos incompleta. Migraciones pendientes: ${pendientes.join(', ')}. Ejecuta npm.cmd run db:migrate desde backend.`);
}
