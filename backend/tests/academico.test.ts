import assert from 'node:assert/strict';
import { crearBaseAislada } from './database.fixture';
import { test } from 'node:test';
import { pool } from '../src/config/database';
import app from '../src/app';
import jwt from 'jsonwebtoken';
import { JWT_ACCESS_SECRET } from '../src/config/env';
import { obtenerResumenCreditos } from '../src/repositorios/creditos.repository';
import { listarAvanceEstudiante } from '../src/repositorios/calificaciones.repository';
import { crearMatricula } from '../src/repositorios/matriculas.repository';
import { buscarCursoPorId, listarCursos } from '../src/repositorios/cursos.repository';

test('catálogo, registro, créditos y matrícula separados por carrera', async () => {
  const limpiar = await crearBaseAislada();
  let servidor: ReturnType<typeof app.listen> | undefined;
  try {
    servidor = app.listen(0);
    await new Promise<void>(resolve => servidor!.once('listening', resolve));
    const direccion = servidor.address();
    assert.ok(direccion && typeof direccion !== 'string');
    const base = `http://127.0.0.1:${direccion.port}/api`;
    const carreras = await (await fetch(`${base}/academico/carreras`)).json() as { codigo: string; asignaturas: number }[];
    assert.deepEqual(carreras.map(c => c.codigo).sort(), ['BIO', 'IND', 'SIS']);
    assert.deepEqual(Object.fromEntries(carreras.map(c => [c.codigo, c.asignaturas])), { BIO: 27, IND: 32, SIS: 25 });
    const datos = { nombre: 'Estudiante', correo: 'carrera@example.test', password: 'Prueba123!', cedula: '123456', fechaNacimiento: '2000-01-01', fechaIngreso: '2026-01-01', nacionalidad: 'Colombiana', genero: 'Femenino' };
    const registrar = (body: unknown) => fetch(`${base}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await registrar(datos)).status, 400);
    assert.equal((await registrar({ ...datos, carreraCodigo: 'CIV' })).status, 400);
    const registro = await registrar({ ...datos, carreraCodigo: 'SIS' });
    assert.equal(registro.status, 201);
    const { usuario } = await registro.json() as { usuario: { id: number; carreraCodigo: string } };
    assert.equal(usuario.carreraCodigo, 'SIS');
    const avance = await listarAvanceEstudiante(usuario.id);
    assert.equal(avance.length, 25);
    assert.ok(avance.every(m => m.codigo.startsWith('09')));
    assert.equal((await obtenerResumenCreditos(usuario.id)).creditosBase, 15);
    assert.equal((await obtenerResumenCreditos(usuario.id)).creditosPrograma, 77);
    const token = jwt.sign({ id: usuario.id, nombre: 'Estudiante', rol: 'estudiante' }, JWT_ACCESS_SECRET);
    const cursos = await (await fetch(`${base}/cursos`, { headers: { Authorization: `Bearer ${token}` } })).json();
    assert.deepEqual(cursos, []);
    assert.equal((await fetch(`${base}/academico/estudiantes/sin-carrera`, { headers: { Authorization: `Bearer ${token}` } })).status, 403);
    const administrador = await pool.query(`INSERT INTO usuarios (nombre, correo, password_hash, rol, cedula, fecha_nacimiento, fecha_ingreso, nacionalidad, genero)
      SELECT nombre, 'admin@example.test', password_hash, 'admin', 'ADMIN', fecha_nacimiento, fecha_ingreso, nacionalidad, genero
      FROM usuarios WHERE id = $1 RETURNING id`, [usuario.id]);
    const tokenAdmin = jwt.sign({ id: administrador.rows[0].id, nombre: 'Admin de prueba', rol: 'admin' }, JWT_ACCESS_SECRET);
    const headersAdmin = { Authorization: `Bearer ${tokenAdmin}`, 'Content-Type': 'application/json' };
    const clon = await pool.query(`INSERT INTO usuarios (nombre, correo, password_hash, rol, cedula, fecha_nacimiento, fecha_ingreso, nacionalidad, genero)
      SELECT nombre, 'anterior@example.test', password_hash, rol, 'ANTERIOR', fecha_nacimiento, fecha_ingreso, nacionalidad, genero
      FROM usuarios WHERE id = $1 RETURNING id`, [usuario.id]);
    const urlAsignacion = `${base}/academico/estudiantes/${clon.rows[0].id}/carrera`;
    assert.equal((await fetch(urlAsignacion, { method: 'PATCH', headers: headersAdmin, body: JSON.stringify({ carreraCodigo: 'SIV' }) })).status, 400);
    assert.equal((await fetch(urlAsignacion, { method: 'PATCH', headers: headersAdmin, body: JSON.stringify({ carreraCodigo: 'BIO' }) })).status, 200);
    assert.equal((await fetch(urlAsignacion, { method: 'PATCH', headers: headersAdmin, body: JSON.stringify({ carreraCodigo: 'IND' }) })).status, 409);
    const estudianteBio = clon.rows[0].id;
    const pensumBio = await listarAvanceEstudiante(estudianteBio);
    assert.ok(pensumBio.some(materia => materia.codigo === '09001'));
    assert.ok(!pensumBio.some(materia => materia.codigo === '03002'));

    await pool.query("UPDATE materias_pensum SET creditos=4 WHERE carrera_codigo='BIO' AND codigo='09006'");
    const grupo = await pool.query(`INSERT INTO cursos (codigo, codigo_pensum, horario, cupos_totales, cupos_disponibles)
      VALUES ('COMPARTIDO', '09006', 'Martes 08:00 - 10:00', 2, 2) RETURNING id`);
    const compartido = await buscarCursoPorId(grupo.rows[0].id);
    assert.ok(compartido);
    assert.deepEqual((await listarCursos(usuario.id)).map(c => [c.id, c.creditos]), [[compartido.id, 3]]);
    assert.deepEqual((await listarCursos(estudianteBio)).map(c => [c.id, c.creditos]), [[compartido.id, 4]]);
    await assert.rejects(crearMatricula(usuario.id, compartido), { codigo: 'PRERREQUISITOS_PENDIENTES' });
    assert.equal((await crearMatricula(estudianteBio, compartido)).creada, true);
    assert.equal((await obtenerResumenCreditos(estudianteBio)).creditosMatriculados, 4);
    const nota = await fetch(`${base}/matriculas/calificaciones/${usuario.id}/09001`, {
      method: 'PUT', headers: headersAdmin, body: JSON.stringify({ corte1: 4, corte2: 4, corte3: 4 })
    });
    assert.equal(nota.status, 200);
    assert.equal((await crearMatricula(usuario.id, compartido)).creada, true);
    assert.equal((await listarCursos(estudianteBio))[0].cuposDisponibles, 0);
    const notaAjena = await fetch(`${base}/matriculas/calificaciones/${usuario.id}/ISI01`, {
      method: 'PUT', headers: headersAdmin, body: JSON.stringify({ corte1: 4, corte2: 4, corte3: 4 })
    });
    assert.equal(notaAjena.status, 404);
    await pool.query(`INSERT INTO cursos (codigo, codigo_pensum, horario, cupos_totales, cupos_disponibles)
      VALUES ('BIOTEST', '03001', 'Lunes 8:00', 30, 30)`);
    const nuevo = await pool.query("SELECT id FROM cursos WHERE codigo = 'BIOTEST'");
    const cursoNuevo = await buscarCursoPorId(nuevo.rows[0].id);
    assert.ok(cursoNuevo);
    await assert.rejects(crearMatricula(usuario.id, cursoNuevo), (e: any) => e.codigo === 'CURSO_OTRA_CARRERA');
    const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correo: datos.correo, password: datos.password }) });
    assert.equal((await login.json() as any).usuario.carreraCodigo, 'SIS');
  } finally {
    if (servidor) await new Promise<void>((resolve, reject) => servidor!.close(e => e ? reject(e) : resolve()));
    await limpiar();
    await pool.end();
  }
});
