import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { pool } from '../src/config/database';
import { JWT_ACCESS_SECRET } from '../src/config/env';
import { crearBaseAislada } from './database.fixture';

test('rutas protegidas rechazan cuentas desactivadas y cambios de rol', async () => {
  const limpiar = await crearBaseAislada();
  const servidor = app.listen(0); await once(servidor,'listening');
  try {
    const d=servidor.address();assert.ok(d && typeof d!=='string');
    const r=await pool.query(`INSERT INTO usuarios(nombre,correo,password_hash,rol,cedula,fecha_nacimiento,fecha_ingreso,nacionalidad,genero)
      VALUES('Admin','admin@test.example','hash','admin','ADMIN','2000-01-01',CURRENT_DATE,'Prueba','Otro') RETURNING id`);
    const id=r.rows[0].id;
    const headers={Authorization:`Bearer ${jwt.sign({id,nombre:'Admin',rol:'admin'},JWT_ACCESS_SECRET)}`};
    const url=`http://127.0.0.1:${d.port}/api/auth/profesores`;
    assert.equal((await fetch(url,{headers})).status,200);
    await pool.query('UPDATE usuarios SET activo=FALSE WHERE id=$1',[id]);
    assert.equal((await fetch(url,{headers})).status,401);
    await pool.query("UPDATE usuarios SET activo=TRUE,rol='profesor' WHERE id=$1",[id]);
    assert.equal((await fetch(url,{headers})).status,403);
  } finally { await new Promise<void>(r=>servidor.close(()=>r()));await limpiar();await pool.end(); }
});
