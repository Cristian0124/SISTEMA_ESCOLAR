import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crearBaseAislada } from './database.fixture';
import { pool } from '../src/config/database';
import { buscarCursoPorId } from '../src/repositorios/cursos.repository';
import { crearMatricula } from '../src/repositorios/matriculas.repository';
import { HttpError } from '../src/types/http-error';

test('horarios: conversión, cruces, consecutivos y solicitudes simultáneas', async () => {
  const limpiar = await crearBaseAislada();
  try {
    // También se convierte el catálogo que existía antes de la migración.
    const original = await buscarCursoPorId(1);
    assert.equal(original?.sesiones?.[0].dia, 1);
    assert.equal(original?.sesiones?.[0].horaInicio, '07:00:00');
    await pool.query("UPDATE carreras SET prerrequisitos_verificados = TRUE WHERE codigo = 'SIV'");
    const usuario = await pool.query(`INSERT INTO usuarios
      (nombre, correo, password_hash, cedula, fecha_nacimiento, fecha_ingreso, nacionalidad, genero, carrera_codigo)
      VALUES ('Horario', 'horario@example.test', 'hash', 'HORARIO', '2000-01-01', CURRENT_DATE, 'Colombiana', 'Otro', 'SIV') RETURNING id`);
    const usuarioId = usuario.rows[0].id;
    async function curso(codigo: string, materia: string, horario: string) {
      const r = await pool.query(`INSERT INTO cursos (codigo, codigo_pensum, horario, cupos_totales, cupos_disponibles)
        VALUES ($1, $2, $3, 30, 30) RETURNING id`, [codigo, materia, horario]);
      const c = await buscarCursoPorId(r.rows[0].id);
      assert.ok(c);
      return c;
    }
    const a = await curso('HORA', '10001', 'Lunes 08:00 - 10:00');
    const b = await curso('HORB', '10002', 'Lunes 09:00 - 11:00');
    const c = await curso('HORC', '10003', 'Lunes 10:00 - 12:00');
    const ambiguo = await curso('HORD', '10004', 'Lunes 8:00');
    assert.equal(a.sesiones?.length, 1);
    assert.deepEqual(ambiguo.sesiones, []);
    assert.equal((await crearMatricula(usuarioId, a)).creada, true);
    await assert.rejects(crearMatricula(usuarioId, b), (e: unknown) =>
      e instanceof HttpError && e.statusCode === 409 && e.codigo === 'CRUCE_HORARIO'
      && /HORA/.test(e.message) && /08:00 - 10:00/.test(e.message));
    assert.equal((await crearMatricula(usuarioId, c)).creada, true);
    await assert.rejects(crearMatricula(usuarioId, ambiguo), (e: unknown) =>
      e instanceof HttpError && e.codigo === 'HORARIO_PENDIENTE_REVISION');
    await pool.query('DELETE FROM matriculas WHERE usuario_id = $1', [usuarioId]);

    // Dos conexiones reales compiten por la fila del mismo estudiante.
    const resultados = await Promise.allSettled([crearMatricula(usuarioId, a), crearMatricula(usuarioId, b)]);
    assert.equal(resultados.filter(r => r.status === 'fulfilled').length, 1);
    const rechazo = resultados.find(r => r.status === 'rejected') as PromiseRejectedResult;
    assert.equal(rechazo.reason.codigo, 'CRUCE_HORARIO');
    const cantidad = await pool.query('SELECT count(*)::integer AS n FROM matriculas WHERE usuario_id = $1', [usuarioId]);
    assert.equal(cantidad.rows[0].n, 1);

    // Las matrículas de otros periodos no bloquean.
    await pool.query("UPDATE matriculas SET periodo = '2000-1' WHERE usuario_id = $1", [usuarioId]);
    const otro = await curso('HORE', '10005', 'Lunes 08:30 - 10:30');
    assert.equal((await crearMatricula(usuarioId, otro)).creada, true);
  } finally {
    await limpiar();
    await pool.end();
  }
});
