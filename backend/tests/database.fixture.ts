import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pool } from '../src/config/database';

export async function crearBaseAislada() {
  const schema = `test_academico_${randomUUID().replaceAll('-', '')}`;
  const cliente = await pool.connect();
  try {
    await cliente.query(`CREATE SCHEMA "${schema}"`);
    pool.options.options = `-c search_path=${schema}`;
    await cliente.query(`SET search_path TO "${schema}"`);
    for (const nombre of ['001_usuarios', '002_prerrequisitos_calificaciones', '002_matriculas', '003_cursos', '004_cortes_calificaciones', '005_solicitudes_creditos', '006_soporte_docente', '007_facultades_carreras', '008_horarios_cursos', '009_sesiones_auth', '010_horarios_multisesion']) {
      await cliente.query(await readFile(`src/database/migrations/${nombre}.sql`, 'utf8'));
    }
  } catch (error) {
    await cliente.query('ROLLBACK');
    await cliente.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    throw error;
  } finally { cliente.release(); }
  return async () => { await pool.query(`DROP SCHEMA "${schema}" CASCADE`); };
}
