import assert from "node:assert/strict";
import { once } from "node:events";
import { setTimeout as esperar } from "node:timers/promises";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import app from "../src/app";
import { pool } from "../src/config/database";
import { JWT_ACCESS_SECRET } from "../src/config/env";
import { crearBaseAislada } from "./database.fixture";

test("demostración visual: permisos, progreso real, aislamiento y resultado", {timeout:60000}, async () => {
  // Incluye el estudiante 333 para detectar colisiones entre el mutex global y los bloqueos de matrícula.
  const estudiantes=Number(process.env.SIMULACION_ESTUDIANTES ?? 500);
  const limpiar=await crearBaseAislada();
  const servidor=app.listen(0);
  await once(servidor,"listening");
  try {
    const direccion=servidor.address();assert.ok(direccion && typeof direccion!=="string");
    const base=`http://127.0.0.1:${direccion.port}/api/masiva/simulacion`;
    const usuarios=(await pool.query<{id:number;rol:string}>(
      `INSERT INTO usuarios(nombre,correo,password_hash,rol,cedula,fecha_nacimiento,fecha_ingreso,nacionalidad,genero)
       VALUES('Admin','demo-admin@example.test','hash','admin','DEMOADMIN','2000-01-01',CURRENT_DATE,'Prueba','Otro'),
        ('Estudiante','demo-alumno@example.test','hash','estudiante','DEMOALUMNO','2000-01-01',CURRENT_DATE,'Prueba','Otro')
       RETURNING id,rol`
    )).rows;
    const cabecera=(rol:string)=>{
      const usuario=usuarios.find(u=>u.rol===rol)!;
      return {"Content-Type":"application/json",Authorization:"Bearer "+jwt.sign({id:usuario.id,nombre:rol,rol},JWT_ACCESS_SECRET)};
    };
    assert.equal((await fetch(base,{headers:cabecera("estudiante")})).status,403);
    assert.equal((await fetch(base,{method:"POST",headers:cabecera("admin"),body:JSON.stringify({estudiantes:5000,cupos:30,modoExposicion:true})})).status,400);
    const iniciar=()=>fetch(base,{method:"POST",headers:cabecera("admin"),body:JSON.stringify({estudiantes,cupos:8,modoExposicion:true})});
    assert.equal((await iniciar()).status,202);
    assert.equal((await iniciar()).status,409);
    let estado: { estado:string; progreso:unknown; resultado:{correcto:boolean;matriculas:number;duplicadas:number;motivosRechazo:{codigo_error:string;cantidad:number}[]} | null } | undefined;
    let huboProgreso=false;
    const limite=Date.now()+45000;
    do {
      estado=await (await fetch(base,{headers:cabecera("admin")})).json() as typeof estado;
      huboProgreso ||= !!estado?.progreso;
      if (estado && ["completada","fallida"].includes(estado.estado)) break;
      await esperar(150);
    } while (Date.now()<limite);
    assert.equal(estado?.estado,"completada");
    assert.equal(huboProgreso,true);
    assert.equal(estado?.resultado?.correcto,true);
    assert.equal(estado?.resultado?.matriculas,8);
    assert.equal(estado?.resultado?.duplicadas,0);
    assert.deepEqual(estado?.resultado?.motivosRechazo,[{codigo_error:"SIN_CUPOS",cantidad:estudiantes-8}]);
    assert.equal((await pool.query("SELECT count(*)::integer AS n FROM cursos")).rows[0].n,0);
    assert.equal((await pool.query("SELECT count(*)::integer AS n FROM solicitudes_matricula")).rows[0].n,0);

    // Una petición que falla antes de entrar a la cola debe cerrar la prueba con error.
    const bloqueador=await pool.connect();
    try {
      await bloqueador.query('SELECT pg_advisory_lock(20261111,1)');
      const parcial=await fetch(base,{method:'POST',headers:cabecera('admin'),body:JSON.stringify({estudiantes:20,cupos:8,modoExposicion:false})});
      assert.equal(parcial.status,202);
      const limiteParcial=Date.now()+30000;
      let fallida: {estado:string;resultado:{correcto:boolean;errores:Record<string,number>} | null;progreso:{recibidas:number} | null} | undefined;
      do {
        fallida=await (await fetch(base,{headers:cabecera('admin')})).json() as typeof fallida;
        if (fallida && ['completada','fallida'].includes(fallida.estado)) break;
        await esperar(150);
      } while(Date.now()<limiteParcial);
      assert.equal(fallida?.estado,'fallida');
      assert.equal(fallida?.resultado?.correcto,false);
      assert.equal(fallida?.resultado?.errores['500'],1);
      assert.equal(fallida?.progreso?.recibidas,19);
    } finally {
      await bloqueador.query('SELECT pg_advisory_unlock(20261111,1)');
      bloqueador.release();
    }
  } finally {
    await new Promise<void>(resolve=>servidor.close(()=>resolve()));
    await limpiar();
    await pool.end();
  }
});
