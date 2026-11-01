import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import express from 'express';
import { manejarError } from '../src/middlewares/error.middleware';

test('errores: referencia de diagnóstico sin exponer información sensible',async contexto=>{
  const log=contexto.mock.method(console,'error',()=>{});
  const app=express();
  app.get('/interno',()=>{throw Object.assign(new Error('password=secreto SQL privado'),{code:'42P01'});});
  app.get('/conexion',()=>{throw Object.assign(new Error('postgresql://privado'),{code:'ECONNREFUSED'});});
  app.use(manejarError);
  const servidor=app.listen(0);await once(servidor,'listening');
  try {
    const d=servidor.address();assert.ok(d && typeof d!=='string');
    for(const [ruta,estado] of [['interno',500],['conexion',503]] as const) {
      const r=await fetch(`http://127.0.0.1:${d.port}/${ruta}`);assert.equal(r.status,estado);
      const cuerpo=await r.json() as {referencia:string};assert.ok(cuerpo.referencia);
      const salida=String(log.mock.calls.at(-1)?.arguments[0]);
      assert.equal(JSON.parse(salida).referencia,cuerpo.referencia);
      assert.ok(!salida.includes('secreto') && !salida.includes('postgresql://'));
      assert.ok(!JSON.stringify(cuerpo).includes('SQL privado'));
    }
  } finally {await new Promise<void>(r=>servidor.close(()=>r()));}
});
