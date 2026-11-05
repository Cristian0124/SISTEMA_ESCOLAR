import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pool } from '../src/config/database';
import { migraciones } from '../src/database/migraciones';

export async function crearBaseAislada() {
  const schema = `test_academico_${randomUUID().replaceAll('-', '')}`;
  const cliente = await pool.connect();
  try {
    await cliente.query(`CREATE SCHEMA "${schema}"`);
    pool.options.options = `-c search_path=${schema}`;
    await cliente.query(`SET search_path TO "${schema}"`);
    for (const { archivo } of migraciones) {
      await cliente.query(await readFile(`src/database/migrations/${archivo}`, 'utf8'));
    }
  } catch (error) {
    await cliente.query('ROLLBACK');
    await cliente.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    throw error;
  } finally { cliente.release(); }
  return async () => { await pool.query(`DROP SCHEMA "${schema}" CASCADE`); };
}
