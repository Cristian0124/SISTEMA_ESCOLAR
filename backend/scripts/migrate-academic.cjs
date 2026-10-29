// Aplica únicamente la ampliación académica, sin ejecutar seeds anteriores.
require('dotenv').config();
const { Pool } = require('pg');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const pool = new Pool({ connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
(async () => {
  const client = await pool.connect();
  try {
    const existe = await client.query("SELECT to_regclass('carreras') AS tabla");
    if (existe.rows[0].tabla) { console.log('La migración académica ya está aplicada.'); return; }
    await client.query(readFileSync(join(__dirname, '../src/database/migrations/007_facultades_carreras.sql'), 'utf8'));
    console.log('Facultad de Ingeniería y once carreras instaladas. Datos anteriores conservados.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error.message);
    process.exitCode = 1;
  } finally { client.release(); await pool.end(); }
})();
