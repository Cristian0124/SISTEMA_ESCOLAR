import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { pool } from '../src/config/database';
import { JWT_ACCESS_SECRET } from '../src/config/env';
import { verificarEsquema } from '../src/config/schema';
import { crearBaseAislada } from './database.fixture';

test('soporte: envío, respuesta y detección de migración ausente', async () => {
  const limpiar = await crearBaseAislada();
  const servidor = app.listen(0);
  await once(servidor, 'listening');
  try {
    const direccion = servidor.address(); assert.ok(direccion && typeof direccion !== 'string');
    const base = `http://127.0.0.1:${direccion.port}/api/soporte`;
    const headers: Record<string, Record<string, string>> = {};
    for (const rol of ['profesor', 'admin']) {
      const r = await pool.query(`INSERT INTO usuarios(nombre,correo,password_hash,rol,cedula,fecha_nacimiento,fecha_ingreso,nacionalidad,genero)
        VALUES($1,$2,'hash',$1,$1,'2000-01-01',CURRENT_DATE,'Prueba','Otro') RETURNING id`, [rol, `${rol}@test.example`]);
      headers[rol] = { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign({id:r.rows[0].id,nombre:rol,rol}, JWT_ACCESS_SECRET)}` };
    }
    assert.equal((await fetch(`${base}/mias`, { method:'POST', headers:headers.profesor, body:JSON.stringify({mensaje:'Necesito ayuda con mi curso'}) })).status, 201);
    const lista = await (await fetch(`${base}/admin`, {headers:headers.admin})).json() as {id:number}[];
    assert.equal(lista.length,1);
    assert.equal((await fetch(`${base}/admin/${lista[0].id}`, {method:'PATCH',headers:headers.admin,body:JSON.stringify({respuesta:'Tu consulta ha sido atendida'})})).status,204);
    const mias = await (await fetch(`${base}/mias`, {headers:headers.profesor})).json() as {respuesta:string}[];
    assert.equal(mias[0].respuesta,'Tu consulta ha sido atendida');
    await verificarEsquema();
    await pool.query('DROP TABLE solicitudes_soporte');
    await assert.rejects(verificarEsquema(), /006_soporte_docente.sql/);
  } finally { await new Promise<void>(r=>servidor.close(()=>r())); await limpiar(); await pool.end(); }
});
