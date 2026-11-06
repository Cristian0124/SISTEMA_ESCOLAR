import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { pool } from '../src/config/database';
import { JWT_ACCESS_SECRET } from '../src/config/env';
import { crearBaseAislada } from './database.fixture';

test('perfil persistente: validación, privacidad, correo único y foto',async()=>{
  const limpiar=await crearBaseAislada();const servidor=app.listen(0);await once(servidor,'listening');
  try {
    const d=servidor.address();assert.ok(d && typeof d!=='string');const base=`http://127.0.0.1:${d.port}/api/perfil`;
    const usuarios:Record<string,{id:number;headers:Record<string,string>}>={};
    for(const nombre of ['uno','dos','profesor']) {
      const rol=nombre==='profesor'?'profesor':'estudiante';
      const r=await pool.query(`INSERT INTO usuarios(nombre,correo,password_hash,rol,cedula,fecha_nacimiento,fecha_ingreso,nacionalidad,genero,carrera_codigo)
        VALUES($1,$2,'hash',$3,$1,'2000-01-01',CURRENT_DATE,'Colombiana','Otro',$4) RETURNING id`,[nombre,`${nombre}@example.test`,rol,rol==='estudiante'?'SIS':null]);
      usuarios[nombre]={id:r.rows[0].id,headers:{'Content-Type':'application/json',Authorization:`Bearer ${jwt.sign({id:r.rows[0].id,nombre,rol},JWT_ACCESS_SECRET)}`}};
    }
    assert.equal((await fetch(`${base}/datos`)).status,401);
    assert.equal((await fetch(`${base}/datos`,{headers:usuarios.profesor.headers})).status,403);
    const personales={nombre:'Nombre actualizado',correo:'nuevo@example.test',nacionalidad:'Colombiana',ciudad:'Cali',direccion:'Calle 1',telefono:'123',celular:'321',tipoSangre:'O+'};
    const hoja={descripcion:'Mi experiencia',foto:'',estudios:[{titulo:'Ingeniería',institucion:'Universidad',estado:'En curso',periodo:'2026'}]};
    const put=(ruta:string,body:unknown)=>fetch(`${base}/${ruta}`,{method:'PUT',headers:usuarios.uno.headers,body:JSON.stringify(body)});
    assert.equal((await put('datos',personales)).status,200);
    await pool.query('INSERT INTO perfiles_usuarios(usuario_id, hoja_vida) VALUES($1, $2) ON CONFLICT(usuario_id) DO UPDATE SET hoja_vida=EXCLUDED.hoja_vida', [usuarios.uno.id, JSON.stringify(hoja)]);
    const get=async(nombre:string,ruta:string)=>(await fetch(`${base}/${ruta}`,{headers:usuarios[nombre].headers})).json() as Promise<Record<string,unknown>>;
    const datos=await get('uno','datos');assert.equal(datos.nombre,personales.nombre);assert.equal(datos.ciudad,'Cali');assert.equal(datos.correo,'nuevo@example.test');assert.equal('password_hash' in datos,false);
    assert.deepEqual((await pool.query('SELECT hoja_vida FROM perfiles_usuarios WHERE usuario_id=$1', [usuarios.uno.id])).rows[0].hoja_vida,hoja);
    assert.equal((await get('dos','datos')).ciudad,'');
    assert.equal((await put('datos',{...personales,usuarioId:usuarios.dos.id})).status,400);
    assert.equal((await put('datos',{...personales,carreraCodigo:'CIV'})).status,400);
    assert.equal((await put('datos',{...personales,correo:'dos@example.test',ciudad:'Bogotá'})).status,409);
    assert.equal((await get('uno','datos')).ciudad,'Cali');
    const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQ0AAAAASUVORK5CYII=';
    await pool.query('UPDATE perfiles_usuarios SET hoja_vida=$2 WHERE usuario_id=$1', [usuarios.uno.id, JSON.stringify({...hoja,foto:png})]);
    assert.equal((await get('uno','datos')).foto,png);
    assert.equal((await get('dos','datos')).foto,'');
    assert.equal((await put('datos',personales)).status,200);
    assert.equal((await get('uno','datos')).foto,png);
    assert.equal((await put('datos',{...personales,foto:'data:image/png;base64,YmFzdXJh'})).status,400);
    assert.equal((await put('datos',{...personales,foto:''})).status,200);
    assert.deepEqual((await pool.query('SELECT hoja_vida FROM perfiles_usuarios WHERE usuario_id=$1', [usuarios.uno.id])).rows[0].hoja_vida,hoja);
    assert.equal((await put('datos',{...personales,foto:png})).status,200);
    assert.equal((await get('uno','datos')).foto,png);
    assert.equal((await get('uno','datos')).ciudad,'Cali');
  } finally {await new Promise<void>(r=>servidor.close(()=>r()));await limpiar();await pool.end();}
});
