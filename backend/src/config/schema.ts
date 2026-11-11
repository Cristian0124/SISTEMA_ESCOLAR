import type { PoolClient } from 'pg';
import { pool } from './database';
import { migraciones } from '../database/migraciones';

const [esquema, catalogo] = migraciones;
const tablasRequeridas = [
  'facultades', 'carreras', 'usuarios', 'materias', 'materias_pensum',
  'prerrequisitos_materia', 'cursos', 'curso_horarios', 'matriculas',
  'calificaciones', 'solicitudes_creditos', 'solicitudes_soporte',
  'sesiones_auth', 'perfiles_usuarios',
];

export async function migracionesPendientes(cliente: Pick<PoolClient, 'query'> = pool): Promise<string[]> {
  const tablas = await cliente.query<{ table_name: string }>(`
    SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()
  `);
  const existentes = new Set(tablas.rows.map(fila => fila.table_name));
  const faltantes = tablasRequeridas.filter(tabla => !existentes.has(tabla));
  if (faltantes.length === tablasRequeridas.length) return migraciones.map(m => m.archivo);
  if (faltantes.length) {
    throw new Error(`Esquema anterior o incompleto. Faltan tablas de ${esquema.archivo}: ${faltantes.join(', ')}. Inicializa una base vacia para esta version.`);
  }

  const { rows } = await cliente.query<{ cargado: boolean }>(
    'SELECT EXISTS (SELECT 1 FROM materias_pensum) AS cargado'
  );
  const nuevas = await cliente.query<{ presente: boolean }>(
    "SELECT to_regclass('solicitudes_matricula') IS NOT NULL AND to_regclass('reservas_cupos') IS NOT NULL AND to_regclass('periodos_matricula') IS NOT NULL AND to_regclass('workers_matricula') IS NOT NULL AND to_regclass('limites_http') IS NOT NULL AS presente"
  );
  const registro = await cliente.query<{ presente:boolean }>("SELECT to_regclass('sis_migraciones') IS NOT NULL AS presente");
  if (registro.rows[0].presente) {
    const aplicadas = new Set((await cliente.query<{ archivo:string }>('SELECT archivo FROM sis_migraciones')).rows.map(m=>m.archivo));
    if (aplicadas.has('003_matricula_masiva.sql') && !nuevas.rows[0].presente) throw new Error('El esquema de matrícula masiva está incompleto.');
    return migraciones.filter(m=>!aplicadas.has(m.archivo)).map(m=>m.archivo);
  }
  return [...(rows[0].cargado ? [] : [catalogo.archivo]), '003_matricula_masiva.sql'];
}

export async function verificarEsquema(): Promise<void> {
  const pendientes = await migracionesPendientes();
  if (pendientes.length) throw new Error(`Migraciones pendientes: ${pendientes.join(', ')}. Ejecuta npm.cmd run db:migrate desde backend.`);
}
