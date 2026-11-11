import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import app from "../src/app";
import { verificarEsquema } from "../src/config/schema";
import { pool } from "../src/config/database";
import { JWT_ACCESS_SECRET } from "../src/config/env";
import { crearBaseAislada } from "./database.fixture";
import { guardarPeriodo } from "../src/repositorios/periodos.repository";
import { encolarSolicitud, tomarSolicitud } from "../src/repositorios/solicitudes.repository";
import { procesarSiguiente } from "../src/colas/matriculas.worker";
import { reservarCupo } from "../src/reservas/reservas.service";
import { recuperarSolicitudes } from "../src/reservas/reconciliacion";
import { crearMatricula } from "../src/services/matriculas.service";

test("matrícula masiva: permisos, duplicados, cupos, reservas vencidas y recuperación", async () => {
  const limpiar = await crearBaseAislada();
  const servidor = app.listen(0);
  await once(servidor,"listening");
  try {
    const usuarios = (await pool.query<{ id:number }>(
      `INSERT INTO usuarios(nombre,correo,password_hash,cedula,fecha_nacimiento,fecha_ingreso,nacionalidad,genero,carrera_codigo)
       SELECT 'Masiva '||g,'masiva'||g||'@example.test','hash','MASIVA'||g,'2000-01-01',CURRENT_DATE,'Prueba','Otro','SIS'
       FROM generate_series(1,12) g RETURNING id`
    )).rows;
    const curso = (await pool.query<{ id:number }>(
      `INSERT INTO cursos(codigo,codigo_pensum,horario,cupos_totales,cupos_disponibles)
       VALUES('MASIVA','09005','Lunes 08:00 - 10:00',3,3) RETURNING id`
    )).rows[0];
    await assert.rejects(encolarSolicitud(usuarios[0].id,curso.id,randomUUID(),"prueba"),{ codigo:"MATRICULA_CERRADA" });
    await guardarPeriodo(new Date(Date.now()-60000).toISOString(),new Date(Date.now()+3600000).toISOString(),true);
    const clave=randomUUID();
    const duplicadas=await Promise.all(Array.from({length:6},() => encolarSolicitud(usuarios[0].id,curso.id,clave,"duplicada")));
    assert.equal(new Set(duplicadas.map(s=>s.id)).size,1);
    await Promise.all(usuarios.slice(1,8).map(u=>encolarSolicitud(u.id,curso.id,randomUUID(),"carga")));
    await Promise.all(Array.from({length:8},()=>procesarSiguiente()));
    await pool.query("UPDATE solicitudes_matricula SET disponible_en=clock_timestamp() WHERE estado='en_espera'");
    while (await procesarSiguiente()) { /* Drena los reintentos que esperaron una reserva. */ }
    const ocupacion=await pool.query("SELECT count(*)::integer AS n FROM matriculas WHERE curso_id=$1",[curso.id]);
    assert.equal(ocupacion.rows[0].n,3);
    const estados=await pool.query("SELECT estado,count(*)::integer AS n FROM solicitudes_matricula GROUP BY estado");
    assert.equal(estados.rows.find(s=>s.estado==="confirmada")?.n,3);
    assert.equal(estados.rows.find(s=>s.estado==="rechazada")?.n,5);

    // Se usa otro curso para verificar un fallo entre la reserva y la confirmación.
    const segundo=(await pool.query<{id:number}>(`INSERT INTO cursos(codigo,codigo_pensum,horario,cupos_totales,cupos_disponibles)
      VALUES('RECUPERA','09001','Martes 08:00 - 10:00',1,1) RETURNING id`)).rows[0];
    const s=await encolarSolicitud(usuarios[8].id,segundo.id,randomUUID(),"recuperacion");
    const tomada=await tomarSolicitud();assert.ok(tomada);assert.equal(tomada.id,s.id);
    await reservarCupo(tomada);
    await pool.query("UPDATE reservas_cupos SET vence_en=clock_timestamp()-interval '1 second' WHERE solicitud_id=$1",[s.id]);
    await assert.rejects(crearMatricula(tomada.usuario_id,tomada.curso_id,{id:tomada.id,token:tomada.token}),/RESERVA_VENCIDA/);
    assert.equal((await pool.query("SELECT count(*)::integer AS n FROM matriculas WHERE curso_id=$1",[segundo.id])).rows[0].n,0);
    await pool.query("UPDATE solicitudes_matricula SET vence_en=clock_timestamp()-interval '1 second' WHERE id=$1",[s.id]);
    await recuperarSolicitudes();
    await assert.rejects(crearMatricula(tomada.usuario_id,tomada.curso_id,{id:tomada.id,token:tomada.token}),/ARRENDAMIENTO_VENCIDO/);
    await procesarSiguiente();
    assert.equal((await pool.query("SELECT estado FROM solicitudes_matricula WHERE id=$1",[s.id])).rows[0].estado,"confirmada");

    const direccion=servidor.address();assert.ok(direccion && typeof direccion!=="string");
    const base=`http://127.0.0.1:${direccion.port}/api`;
    const headers={ Authorization:"Bearer "+jwt.sign({id:usuarios[9].id,nombre:"Masiva",rol:"estudiante"},JWT_ACCESS_SECRET) };
    assert.equal((await fetch(base+"/masiva/monitoreo",{headers})).status,403);
    assert.equal((await fetch(base+"/matriculas/solicitudes/"+s.id,{headers})).status,404);
    const correlacion=await fetch(base+"/masiva/periodo",{headers:{...headers,"x-correlation-id":"prueba-123"}});
    assert.equal(correlacion.headers.get("x-correlation-id"),"prueba-123");
    await guardarPeriodo(new Date(Date.now()-60000).toISOString(),new Date(Date.now()+3600000).toISOString(),false);
    const cerrada=await fetch(base+"/matriculas",{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({cursoId:segundo.id})});
    assert.equal(cerrada.status,409);
    for (let i=0;i<20;i++) {
      const respuesta=await fetch(base+"/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
      assert.equal(respuesta.status,401);
    }
    const limitada=await fetch(base+"/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
    assert.equal(limitada.status,429);
    assert.ok(limitada.headers.get("retry-after"));
    await verificarEsquema();
    await pool.query("DROP TABLE reservas_cupos");
    await assert.rejects(verificarEsquema(), /incompleto/);
  } finally {
    await new Promise<void>(resolve=>servidor.close(()=>resolve()));
    await limpiar();
    await pool.end();
  }
});
