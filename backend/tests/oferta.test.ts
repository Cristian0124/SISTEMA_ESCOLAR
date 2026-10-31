import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { pool } from '../src/config/database';
import { JWT_ACCESS_SECRET } from '../src/config/env';
import { crearBaseAislada } from './database.fixture';

test('crear grupos con varias sesiones y rechazar horarios inválidos',async()=>{
  const limpiar=await crearBaseAislada();const servidor=app.listen(0);await once(servidor,'listening');
  try {
    const ids:Record<string,number>={};
    for(const rol of ['admin','profesor']) {
      const r=await pool.query(`INSERT INTO usuarios(nombre,correo,password_hash,rol,cedula,fecha_nacimiento,fecha_ingreso,nacionalidad,genero)
        VALUES($1,$2,'hash',$1,$1,'2000-01-01',CURRENT_DATE,'Prueba','Otro') RETURNING id`,[rol,`${rol}@example.test`]);ids[rol]=r.rows[0].id;
    }
    const d=servidor.address();assert.ok(d && typeof d!=='string');
    const headers={'Content-Type':'application/json',Authorization:`Bearer ${jwt.sign({id:ids.admin,nombre:'Admin',rol:'admin'},JWT_ACCESS_SECRET)}`};
    const sesiones=[{dia:1,horaInicio:'08:00',horaFin:'10:00'},{dia:3,horaInicio:'14:00',horaFin:'16:00'}];
    const crear=(horas:unknown)=>fetch(`http://127.0.0.1:${d.port}/api/cursos`,{method:'POST',headers,body:JSON.stringify({codigoPensum:'10001',profesorId:ids.profesor,cuposTotales:30,sesiones:horas})});
    const resultado=await crear(sesiones);assert.equal(resultado.status,201);
    const curso=await resultado.json() as {id:number;sesiones:unknown[];horario:string};
    assert.equal(curso.sesiones.length,2);assert.match(curso.horario,/Miércoles 14:00/);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM curso_horarios WHERE curso_id=$1',[curso.id])).rows[0].n,2);
    assert.equal((await crear([{dia:1,horaInicio:'12:00',horaFin:'08:00'}])).status,400);
    assert.equal((await crear([sesiones[0],{dia:1,horaInicio:'09:00',horaFin:'11:00'}])).status,400);
    assert.equal((await crear([])).status,400);
    assert.equal((await crear([{dia:8,horaInicio:'08:00',horaFin:'09:00'}])).status,400);
  } finally {await new Promise<void>(r=>servidor.close(()=>r()));await limpiar();await pool.end();}
});
