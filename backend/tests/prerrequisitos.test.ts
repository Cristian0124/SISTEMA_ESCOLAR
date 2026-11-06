import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pool } from '../src/config/database';
import { crearBaseAislada } from './database.fixture';

test('la base de datos carga los prerrequisitos del plan USC 11915 para Sistemas', async () => {
  const limpiar = await crearBaseAislada();
  try {
    const carreras = await pool.query('SELECT codigo FROM carreras ORDER BY codigo');
    assert.deepEqual(carreras.rows.map(fila => fila.codigo), ['BIO', 'IND', 'SIS']);
    const { rows } = await pool.query(`
      SELECT materia.carrera_codigo AS carrera, relacion.codigo_materia AS materia,
             relacion.codigo_requisito AS requisito
      FROM prerrequisitos_materia relacion
      JOIN materias_pensum materia ON materia.codigo = relacion.codigo_materia AND materia.carrera_codigo = relacion.carrera_codigo
      JOIN carreras carrera ON carrera.codigo = materia.carrera_codigo
      ORDER BY relacion.codigo_materia, relacion.codigo_requisito
    `);
    assert.equal(rows.length, 18);
    assert.ok(rows.every(fila => fila.carrera === 'SIS'));
    const requisitos = (codigo: string) => rows.filter(fila => fila.materia === codigo).map(fila => fila.requisito);
    assert.deepEqual(requisitos('09008'), ['09005']);
    assert.deepEqual(requisitos('09015'), ['09008']);
    assert.deepEqual(requisitos('09017'), ['09009', '09012']);
    assert.deepEqual(requisitos('09024'), ['09015', '09019']);
  } finally {
    await limpiar();
    await pool.end();
  }
});
