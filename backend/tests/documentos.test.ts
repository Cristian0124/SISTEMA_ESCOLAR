import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { pool } from '../src/config/database';
import { JWT_ACCESS_SECRET } from '../src/config/env';
import { crearUsuarioAdministrado } from '../src/repositorios/auth.repository';
import { crearBaseAislada } from './database.fixture';
import { leerPdf } from './pdf.fixture';

test('documentos: autorización, propietario, datos reales y descarga PDF', async () => {
  const limpiar = await crearBaseAislada();
  const servidor = app.listen(0);
  await once(servidor, 'listening');
  const direccion = servidor.address();
  assert.ok(direccion && typeof direccion !== 'string');
  const base = `http://127.0.0.1:${direccion.port}/api/documentos`;
  try {
    async function estudiante(sufijo: string) {
      const u = await crearUsuarioAdministrado({ nombre: `Estudiante ${sufijo}`, correo: `${sufijo}@example.test`,
        cedula: `DOC${sufijo}`, fechaNacimiento: '2000-01-01', fechaIngreso: '2026-01-01',
        nacionalidad: 'Colombiana', genero: 'Otro', carreraCodigo: 'SIV' }, 'hash', 'estudiante');
      assert.ok(u);
      return u;
    }
    const propio = await estudiante('propio');
    const ajeno = await estudiante('ajeno');
    const auth = (id: number, rol = 'estudiante') => ({ Authorization: `Bearer ${jwt.sign({ id, nombre: 'Dato del token que no debe imprimirse', rol }, JWT_ACCESS_SECRET)}` });
    assert.equal((await fetch(`${base}/resumen-matricula.pdf`)).status, 401);
    assert.equal((await fetch(`${base}/resumen-matricula.pdf`, { headers: auth(propio.id, 'profesor') })).status, 403);
    assert.equal((await fetch(`${base}/resumen-matricula.pdf`, { headers: auth(propio.id, 'admin') })).status, 403);
    const vacio = await fetch(`${base}/resumen-matricula`, { headers: auth(propio.id) });
    assert.deepEqual((await vacio.json() as { cursos: unknown[] }).cursos, []);
    assert.equal((await fetch(`${base}/resumen-matricula.pdf`, { headers: auth(propio.id) })).status, 409);

    const cursos = await pool.query(`INSERT INTO cursos (codigo, codigo_pensum, horario, cupos_totales, cupos_disponibles)
      VALUES ('DOC01', '10001', 'Lunes 08:00 - 10:00', 30, 30), ('DOC02', '10002', 'Martes 14:00 - 16:00', 30, 30)
      RETURNING id`);
    for (const c of cursos.rows) await pool.query("INSERT INTO matriculas(usuario_id, curso_id, curso) VALUES ($1, $2, '{}'::jsonb)", [propio.id, c.id]);
    await pool.query("INSERT INTO matriculas(usuario_id, curso_id, curso) VALUES ($1, 2, '{}'::jsonb)", [ajeno.id]);
    await pool.query("INSERT INTO matriculas(usuario_id, curso_id, curso, periodo) VALUES ($1, 3, '{}'::jsonb, '2000-1')", [propio.id]);

    const r = await fetch(`${base}/resumen-matricula?usuarioId=${ajeno.id}`, { headers: auth(propio.id) });
    const resumen = await r.json() as { estudiante: { id: number; nombre: string; carrera: string }; periodo: string; cursos: { codigo: string; nombre: string; creditos: number }[]; totalCreditos: number };
    assert.equal(resumen.estudiante.id, propio.id);
    assert.equal(resumen.estudiante.nombre, propio.nombre);
    assert.ok(resumen.estudiante.carrera.includes('Sistemas'));
    assert.deepEqual(resumen.cursos.map(c => c.codigo), ['DOC01', 'DOC02']);
    assert.equal(resumen.totalCreditos, 6);
    const respuesta = await fetch(`${base}/resumen-matricula.pdf?usuarioId=${ajeno.id}`, { headers: auth(propio.id) });
    assert.equal(respuesta.status, 200);
    assert.match(respuesta.headers.get('content-type')!, /^application\/pdf/);
    assert.match(respuesta.headers.get('content-disposition')!, /^attachment; filename="resumen-matricula-\d{4}-[12]\.pdf"$/);
    assert.equal(respuesta.headers.get('cache-control'), 'no-store');
    const { texto } = await leerPdf(new Uint8Array(await respuesta.arrayBuffer()));
    for (const valor of [propio.nombre, 'DOCpropio', resumen.estudiante.carrera, resumen.periodo,
      'Lunes 08:00 - 10:00', 'Martes 14:00 - 16:00', 'Créditos: 3', 'Total de créditos: 6']) assert.ok(texto.includes(valor), valor);
    for (const c of resumen.cursos) assert.ok(texto.includes(c.nombre));
    assert.ok(!texto.includes(ajeno.nombre));
    assert.ok(!texto.includes('SIS201'));
    assert.ok(!texto.includes('Dato del token'));
    await pool.query('UPDATE usuarios SET activo = FALSE WHERE id = $1', [propio.id]);
    assert.equal((await fetch(`${base}/resumen-matricula.pdf`, { headers: auth(propio.id) })).status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => servidor.close(e => e ? reject(e) : resolve()));
    await limpiar();
    await pool.end();
  }
});
