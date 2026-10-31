import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../config/database';
import { migraciones, migracionesPendientes, verificarEsquema } from '../config/schema';

async function ejecutar() {
  if (process.argv.includes('--check')) {
    await verificarEsquema();
    console.log('Esquema de base de datos completo.');
    return;
  }
  const cliente = await pool.connect();
  try {
    await cliente.query('SELECT pg_advisory_lock(hashtext(current_database()), hashtext(current_schema()))');
    const pendientes = await migracionesPendientes(cliente);
    for (const migracion of migraciones.filter(m => pendientes.includes(m.archivo))) {
      const sql = await readFile(path.resolve(__dirname, '../database/migrations', migracion.archivo), 'utf8');
      await cliente.query('BEGIN');
      // Un único límite transaccional, incluso para migraciones antiguas sin BEGIN.
      await cliente.query(sql.replace(/^\s*(BEGIN|COMMIT);\s*$/gm, ''));
      await cliente.query('COMMIT');
      console.log(`Aplicada: ${migracion.archivo}`);
    }
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    await cliente.query('SELECT pg_advisory_unlock(hashtext(current_database()), hashtext(current_schema()))');
    cliente.release();
  }
  await verificarEsquema();
}

ejecutar().catch(error => {
  console.error(error instanceof Error ? error.message : 'No fue posible verificar la base de datos');
  process.exitCode = 1;
}).finally(() => pool.end());
