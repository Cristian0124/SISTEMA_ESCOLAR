// Escenario HTTP real sobre un esquema temporal aislado. Requiere build del backend.
// Usa JWT firmados de cuentas de prueba. No mide el coste de login con bcrypt.
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { once } = require("node:events");
const { performance } = require("node:perf_hooks");
const { setTimeout: esperar } = require("node:timers/promises");
const backend = path.resolve(__dirname,"../backend");
require(path.join(backend,"node_modules/dotenv")).config({path:path.join(backend,".env")});
const jwt = require(path.join(backend,"node_modules/jsonwebtoken"));
const { pool } = require(path.join(backend,"dist/config/database"));
const { JWT_ACCESS_SECRET } = require(path.join(backend,"dist/config/env"));
const { migraciones } = require(path.join(backend,"dist/database/migraciones"));
const app = require(path.join(backend,"dist/app")).default;
const { iniciarWorker } = require(path.join(backend,"dist/colas/matriculas.worker"));

async function main() {
  const cantidad=Number(process.env.CARGA_ESTUDIANTES ?? 1000);
  const capacidad=Number(process.env.CARGA_CUPOS ?? 30);
  const conexiones=Number(process.env.CARGA_CONEXIONES ?? 128);
  if (!Number.isInteger(conexiones) || conexiones<1 || conexiones>2000) throw new Error("CARGA_CONEXIONES debe estar entre 1 y 2000.");
  const agente=new http.Agent({keepAlive:true,maxSockets:conexiones});
  function solicitarHttp(url,opciones) {
    return new Promise((resolve,reject) => {
      const peticion=http.request(url,{method:opciones.method,headers:opciones.headers,agent:agente,signal:opciones.signal},respuesta=>{
        const partes=[];
        respuesta.on("data",parte=>partes.push(parte));
        respuesta.on("end",()=>resolve(new Response(Buffer.concat(partes),{status:respuesta.statusCode,headers:respuesta.headers})));
        respuesta.on("error",reject);
      });
      peticion.on("error",reject);
      peticion.end(opciones.body);
    });
  }
  if (!Number.isInteger(cantidad) || cantidad<1 || cantidad>10000 || !Number.isInteger(capacidad) || capacidad<1 || capacidad>cantidad) {
    throw new Error("Configura entre 1 y 10000 estudiantes y un cupo positivo menor o igual a la cantidad.");
  }
  const schema="carga_"+randomUUID().replaceAll("-","");
  let servidor, detener;
  let esquemaCreado=false;
  let observador;
  let muestreo=Promise.resolve();
  let muestreando=false;
  let fase='preparando';
  let enviadas=0;
  const comienzoPrueba=performance.now();
  const cancelacion=new AbortController();
  process.once('disconnect',()=>cancelacion.abort());
  function comunicar(mensaje) { if (process.connected && process.send) process.send(mensaje); }
  async function progreso() {
    if (muestreando) return;
    muestreando=true;
    try {
      const datos=(await pool.query(`SELECT count(*)::integer AS recibidas,
        count(*) FILTER(WHERE estado='en_espera')::integer AS pendientes,
        count(*) FILTER(WHERE estado='procesando')::integer AS procesando,
        count(*) FILTER(WHERE estado='confirmada')::integer AS confirmadas,
        count(*) FILTER(WHERE estado='rechazada')::integer AS rechazadas,
        (SELECT count(*)::integer FROM reservas_cupos WHERE vence_en>clock_timestamp()) AS reservas,
        (SELECT count(*)::integer FROM matriculas) AS matriculas
        FROM solicitudes_matricula`)).rows[0];
      comunicar({tipo:'progreso',datos:{...datos,fase,enviadas,estudiantes:cantidad,cupos:capacidad,
        transcurridoMs:Math.round(performance.now()-comienzoPrueba)}});
    } catch { /* La salida final del proceso comunica los fallos de la ejecución. */ }
    finally { muestreando=false; }
  }
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`);
    esquemaCreado=true;
    comunicar({tipo:"esquema",schema});
    // El pool todavía tiene una conexión libre. Todas las conexiones nuevas reciben el mismo search_path.
    pool.options.options="-c search_path="+schema;
    await pool.query(`SET search_path TO "${schema}"`);
    for (const {archivo} of migraciones) {
      await pool.query(fs.readFileSync(path.join(backend,"src/database/migrations",archivo),"utf8"));
    }
    const usuarios=(await pool.query(
      `INSERT INTO usuarios(nombre,correo,password_hash,cedula,fecha_nacimiento,fecha_ingreso,nacionalidad,genero,carrera_codigo)
       SELECT 'Carga '||g,'carga'||g||'@example.test','hash','CARGA'||g,'2000-01-01',CURRENT_DATE,'Prueba','Otro','SIS'
       FROM generate_series(1,$1::integer) g RETURNING id`,[cantidad]
    )).rows;
    const curso=(await pool.query(
      `INSERT INTO cursos(codigo,codigo_pensum,horario,cupos_totales,cupos_disponibles)
       VALUES('CARGA','09005','Lunes 08:00 - 10:00',$1,$1) RETURNING id`,[capacidad]
    )).rows[0];
    await pool.query(
      `INSERT INTO periodos_matricula(codigo,apertura,cierre,habilitado)
       VALUES(to_char(CURRENT_DATE,'YYYY')||CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE)<=6 THEN '-1' ELSE '-2' END,
        clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour',true)`
    );
    comunicar({tipo:'preparada'});
    if (process.send) observador=setInterval(()=>{muestreo=progreso();},250);
    servidor=app.listen({port:0,backlog:4096});
    await once(servidor,"listening");
    const base="http://127.0.0.1:"+servidor.address().port+"/api";
    detener=iniciarWorker(4);
    const latencias=[];
    const errores={};
    const erroresTransporte={};
    async function enviar(url,opciones) {
      for (let intento=0;intento<6;intento++) {
        try { return await solicitarHttp(url,opciones); }
        catch(error) {
          const codigo=error.cause?.code??error.name;
          erroresTransporte[codigo]=(erroresTransporte[codigo]??0)+1;
          if (intento===5) throw error;
          await esperar(250*(intento+1));
        }
      }
    }
    fase="ejecutando";
    const inicio=performance.now();
    const envios=await Promise.allSettled(usuarios.map(async usuario => {
      const token=jwt.sign({id:usuario.id,nombre:"Carga",rol:"estudiante"},JWT_ACCESS_SECRET,{expiresIn:"1h"});
      const clave=randomUUID();
      const comienzo=performance.now();
      const respuesta=await enviar(base+"/matriculas",{
        method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token,"Idempotency-Key":clave},
        body:JSON.stringify({cursoId:curso.id}),signal:AbortSignal.any([cancelacion.signal,AbortSignal.timeout(120000)])
      });
      const contenido=await respuesta.json();
      enviadas++;
      latencias.push(performance.now()-comienzo);
      if (respuesta.status!==202 && respuesta.status!==200) errores[respuesta.status]=(errores[respuesta.status]??0)+1;
      return { id:contenido.id,status:respuesta.status,usuarioId:usuario.id,token,clave };
    }));
    const fallida=envios.find(envio=>envio.status==='rejected');
    if (fallida) throw fallida.reason;
    const respuestas=envios.map(envio=>envio.value);
    const aceptadas=respuestas.filter(r=>(r.status===200 || r.status===202) && typeof r.id==='string').length;
    const envioMs=performance.now()-inicio;
    const limite=performance.now()+180000;
    let estados=[];
    while (performance.now()<limite) {
      if (cancelacion.signal.aborted) throw new Error("PRUEBA_CANCELADA");
      estados=(await pool.query("SELECT estado,count(*)::integer AS cantidad FROM solicitudes_matricula GROUP BY estado")).rows;
      // Todos los envíos HTTP ya terminaron. Solo esperamos los trabajos realmente persistidos.
      const pendientes=estados.some(r=>r.estado==='en_espera' || r.estado==='procesando');
      if (!pendientes) break;
      await esperar(100);
    }
    fase='verificando';
    await progreso();
    const motivosRechazo=(await pool.query("SELECT codigo_error,count(*)::integer AS cantidad FROM solicitudes_matricula WHERE estado='rechazada' GROUP BY codigo_error")).rows;
    const rechazosPorCupo=motivosRechazo.filter(m=>m.codigo_error==='SIN_CUPOS').reduce((total,m)=>total+m.cantidad,0);
    const contar=estado=>estados.find(r=>r.estado===estado)?.cantidad??0;
    const totalMs=performance.now()-inicio;
    const inscritas=(await pool.query("SELECT count(*)::integer AS cantidad FROM matriculas WHERE curso_id=$1",[curso.id])).rows[0].cantidad;
    const duplicadas=(await pool.query(
      "SELECT count(*)::integer AS cantidad FROM (SELECT usuario_id,curso_id,periodo FROM matriculas GROUP BY 1,2,3 HAVING count(*)>1) d"
    )).rows[0].cantidad;
    const reintento=respuestas.find(r=>r.id);
    let idempotente=false;
    if (reintento) {
      const repetida=await fetch(base+"/matriculas",{method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+reintento.token,"Idempotency-Key":reintento.clave},
        body:JSON.stringify({cursoId:curso.id})});
      idempotente=(await repetida.json()).id===reintento.id;
    }
    latencias.sort((a,b)=>a-b);
    const percentil=p=>Math.round(latencias[Math.min(latencias.length-1,Math.ceil(latencias.length*p)-1)]??0);
    const tiempos=(await pool.query(
      `SELECT percentile_cont(0.95) WITHIN GROUP(ORDER BY EXTRACT(EPOCH FROM terminada_en-creada_en)*1000) AS p95
       FROM solicitudes_matricula WHERE terminada_en IS NOT NULL`
    )).rows[0];
    const correcto=Object.keys(errores).length===0 && inscritas===capacidad && contar("confirmada")===capacidad
      && contar("rechazada")===cantidad-capacidad && rechazosPorCupo===cantidad-capacidad && duplicadas===0 && idempotente;
    const resultado={
      fecha:new Date().toISOString(),aceptadas,noAceptadas:cantidad-aceptadas,pausaDemostracionMs:Number(process.env.CARGA_PAUSA_MS??0),estudiantes:cantidad,concurrenciaSolicitada:cantidad,conexionesMaximas:conexiones,cupos:capacidad,
      entorno:{node:process.version,plataforma:process.platform,workers:4,pool:pool.options.max??10,
        alcance:"HTTP matrícula con JWT de prueba, mismo equipo para generador, API y workers"},
      envioMs:Math.round(envioMs),totalMs:Math.round(totalMs),solicitudesPorSegundo:Math.round(cantidad/(envioMs/1000)),
      latenciaHttpMs:{p50:percentil(.5),p95:percentil(.95),p99:percentil(.99)},
      tiempoTotalP95Ms:Math.round(tiempos.p95??0),estados,motivosRechazo,matriculas:inscritas,duplicadas,idempotente,errores,erroresTransporte,correcto
    };
    const carpeta=path.join(__dirname,"resultados");
    fs.mkdirSync(carpeta,{recursive:true});
    const archivo=path.join(carpeta,"apertura-"+Date.now()+".json");
    fs.writeFileSync(archivo,JSON.stringify(resultado,null,2)+"\n");
    await progreso();
    comunicar({tipo:"resultado",resultado});
    console.log(JSON.stringify({resultado,archivo},null,2));
    if (!correcto) process.exitCode=1;
  } finally {
    clearInterval(observador);
    await muestreo;
    agente.destroy();
    if (servidor) await new Promise(resolve=>servidor.close(resolve));
    if (detener) await detener();
    // Solo borra el esquema generado por esta ejecución y verificado por su patrón.
    if (esquemaCreado && /^carga_[a-f0-9]{32}$/.test(schema)) await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
    await pool.end();
    if (process.connected) process.disconnect();
  }
}
main().catch(error=>{console.error("Prueba fallida",error.cause?.code??error.code??error.message);process.exitCode=1;});
