import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { test } from 'node:test';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { pool } from '../src/config/database';
import { JWT_REFRESH_SECRET } from '../src/config/env';
import { crearUsuarioAdministrado } from '../src/repositorios/auth.repository';
import { crearSesion } from '../src/repositorios/sesiones.repository';
import { crearBaseAislada } from './database.fixture';

const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const cookieDe = (respuesta: Response) => {
  const cookie = respuesta.headers.get('set-cookie');
  assert.ok(cookie);
  return cookie.split(';')[0];
};

test('sesiones persistentes y contrato HTTP', async contexto => {
  const limpiar = await crearBaseAislada();
  const servidor = app.listen(0);
  await once(servidor, 'listening');
  const direccion = servidor.address();
  assert.ok(direccion && typeof direccion !== 'string');
  const base = `http://127.0.0.1:${direccion.port}/api/auth`;
  try {
    const usuario = await crearUsuarioAdministrado({
      nombre: 'Sesiones', correo: 'sesiones@example.test', cedula: 'SESIONES',
      fechaNacimiento: '2000-01-01', fechaIngreso: '2026-01-01',
      nacionalidad: 'Colombiana', genero: 'Otro'
    }, await bcrypt.hash('Prueba123!', 4), 'profesor');
    assert.ok(usuario);
    async function login() {
      const r = await fetch(`${base}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: usuario!.correo, password: 'Prueba123!' })
      });
      assert.equal(r.status, 200);
      const datos = await r.json() as Record<string, unknown>;
      assert.ok(datos.accessToken && datos.usuario);
      assert.equal('refreshToken' in datos, false);
      assert.match(r.headers.get('set-cookie')!, /HttpOnly/i);
      assert.match(r.headers.get('set-cookie')!, /SameSite=Strict/i);
      assert.match(r.headers.get('set-cookie')!, /Path=\/api\/auth/i);
      return cookieDe(r);
    }
    const refresh = (cookie: string) => fetch(`${base}/refresh`, { method: 'POST', headers: { Cookie: cookie } });

    await contexto.test('renueva desde un proceso nuevo sin estado compartido en memoria', async () => {
      const cookie = await login();
      const token = cookie.slice('refreshToken='.length);
      const almacenada = await pool.query('SELECT refresh_hash FROM sesiones_auth WHERE usuario_id = $1', [usuario.id]);
      assert.equal(almacenada.rows[0].refresh_hash, hash(token));
      assert.notEqual(almacenada.rows[0].refresh_hash, token);
      // Importa y crea Express en otro proceso; comparte únicamente PostgreSQL.
      const hijo = spawn(process.execPath, ['--import', 'tsx', '-e',
        `const app = require('./src/app').default; const s = app.listen(0, '127.0.0.1', () => console.log(s.address().port));`
      ], { env: { ...process.env, PGOPTIONS: pool.options.options }, stdio: ['ignore', 'pipe', 'pipe'] });
      let errores = '';
      hijo.stderr.on('data', d => { errores += d.toString(); });
      try {
        const puerto = await new Promise<number>((resolve, reject) => {
          let salida = '';
          const timeout = setTimeout(() => reject(new Error(`No inició el proceso: ${errores}`)), 20000);
          hijo.stdout.on('data', d => {
            salida += d.toString();
            const encontrado = salida.match(/^(\d+)\r?$/m);
            if (encontrado) { clearTimeout(timeout); resolve(Number(encontrado[1])); }
          });
          hijo.once('error', e => { clearTimeout(timeout); reject(e); });
          hijo.once('exit', () => { clearTimeout(timeout); reject(new Error(errores)); });
        });
        const r = await fetch(`http://127.0.0.1:${puerto}/api/auth/refresh`, { method: 'POST', headers: { Cookie: cookie } });
        assert.equal(r.status, 200);
        assert.notEqual(cookieDe(r), cookie);
        assert.equal((await refresh(cookie)).status, 401);
      } finally {
        if (hijo.exitCode === null) { const fin = once(hijo, 'exit'); hijo.kill(); await fin; }
      }
    });

    await contexto.test('rechaza JWT expirado y vencimiento persistido', async () => {
      const token = jwt.sign({ sub: String(usuario.id), jti: randomUUID() }, JWT_REFRESH_SECRET, { expiresIn: -1 });
      await crearSesion(usuario.id, hash(token), new Date(Date.now() + 60000));
      assert.equal((await refresh(`refreshToken=${token}`)).status, 401);
      const cookie = await login();
      await pool.query("UPDATE sesiones_auth SET vence_en = CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE refresh_hash = $1", [hash(cookie.slice('refreshToken='.length))]);
      assert.equal((await refresh(cookie)).status, 401);
    });

    await contexto.test('rechaza usuario inactivo', async () => {
      const cookie = await login();
      await pool.query('UPDATE usuarios SET activo = FALSE WHERE id = $1', [usuario.id]);
      try { assert.equal((await refresh(cookie)).status, 401); }
      finally { await pool.query('UPDATE usuarios SET activo = TRUE WHERE id = $1', [usuario.id]); }
    });

    await contexto.test('logout revoca la sesión y borra la cookie', async () => {
      const cookie = await login();
      const r = await fetch(`${base}/logout`, { method: 'POST', headers: { Cookie: cookie } });
      assert.equal(r.status, 204);
      assert.match(r.headers.get('set-cookie')!, /refreshToken=;/);
      assert.equal((await refresh(cookie)).status, 401);
      const revocada = await pool.query('SELECT revocada_en FROM sesiones_auth WHERE refresh_hash = $1', [hash(cookie.slice('refreshToken='.length))]);
      assert.ok(revocada.rows[0].revocada_en);
    });

    await contexto.test('una sola renovación simultánea y rechazo de reutilización', async () => {
      const cookie = await login();
      const respuestas = await Promise.all([refresh(cookie), refresh(cookie)]);
      assert.deepEqual(respuestas.map(r => r.status).sort(), [200, 401]);
      assert.equal((await refresh(cookie)).status, 401);
      const nueva = cookieDe(respuestas.find(r => r.status === 200)!);
      assert.notEqual(nueva, cookie);
      assert.equal((await refresh(nueva)).status, 200);
    });
  } finally {
    await new Promise<void>((resolve, reject) => servidor.close(e => e ? reject(e) : resolve()));
    await limpiar();
    await pool.end();
  }
});
