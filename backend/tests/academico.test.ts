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
import { buscarCursoPorId } from '../src/repositorios/cursos.repository';

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
    assert.equal(carreras.length, 11);
    assert.equal(carreras.reduce((n, c) => n + c.asignaturas, 0), 528);
    const datos = { nombre: 'Estudiante', correo: 'carrera@example.test', password: 'Prueba123!', cedula: '123456', fechaNacimiento: '2000-01-01', fechaIngreso: '2026-01-01', nacionalidad: 'Colombiana', genero: 'Femenino' };
    const registrar = (body: unknown) => fetch(`${base}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await registrar(datos)).status, 400);
    assert.equal((await registrar({ ...datos, carreraCodigo: 'NO_EXISTE' })).status, 400);
    const registro = await registrar({ ...datos, carreraCodigo: 'CIV' });
    assert.equal(registro.status, 201);
    const { usuario } = await registro.json() as { usuario: { id: number; carreraCodigo: string } };
    assert.equal(usuario.carreraCodigo, 'CIV');
    const avance = await listarAvanceEstudiante(usuario.id);
    assert.equal(avance.length, 56);
    assert.ok(avance.every(m => m.codigo.startsWith('04') && !m.prerrequisitosVerificados));
    assert.equal((await obtenerResumenCreditos(usuario.id)).creditosBase, 16);
    assert.equal((await obtenerResumenCreditos(usuario.id)).creditosPrograma, 176);
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
    assert.equal((await fetch(urlAsignacion, { method: 'PATCH', headers: headersAdmin, body: JSON.stringify({ carreraCodigo: 'SIV' }) })).status, 200);
    assert.equal((await fetch(urlAsignacion, { method: 'PATCH', headers: headersAdmin, body: JSON.stringify({ carreraCodigo: 'CIV' }) })).status, 409);
    const nota = await fetch(`${base}/matriculas/calificaciones/${usuario.id}/04001`, {
      method: 'PUT', headers: headersAdmin, body: JSON.stringify({ corte1: 4, corte2: 4, corte3: 4 })
    });
    assert.equal(nota.status, 200);
    const notaAjena = await fetch(`${base}/matriculas/calificaciones/${usuario.id}/ISI01`, {
      method: 'PUT', headers: headersAdmin, body: JSON.stringify({ corte1: 4, corte2: 4, corte3: 4 })
    });
    assert.equal(notaAjena.status, 404);
    const cursoViejo = await buscarCursoPorId(1);
    assert.ok(cursoViejo);
    await assert.rejects(crearMatricula(usuario.id, cursoViejo), (e: any) => e.codigo === 'CURSO_OTRA_CARRERA');
    await pool.query(`INSERT INTO cursos (codigo, codigo_pensum, horario, cupos_totales, cupos_disponibles)
      VALUES ('CIVTEST', '04001', 'Lunes 8:00', 30, 30)`);
    const nuevo = await pool.query("SELECT id FROM cursos WHERE codigo = 'CIVTEST'");
    const cursoNuevo = await buscarCursoPorId(nuevo.rows[0].id);
    assert.ok(cursoNuevo);
    await assert.rejects(crearMatricula(usuario.id, cursoNuevo), (e: any) => e.codigo === 'PENSUM_PENDIENTE_VALIDACION');
    const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correo: datos.correo, password: datos.password }) });
    assert.equal((await login.json() as any).usuario.carreraCodigo, 'CIV');
  } finally {
    if (servidor) await new Promise<void>((resolve, reject) => servidor!.close(e => e ? reject(e) : resolve()));
    await limpiar();
    await pool.end();
  }
});
