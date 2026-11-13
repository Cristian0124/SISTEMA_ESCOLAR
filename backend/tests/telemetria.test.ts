import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Pool } from "pg";
import { pool } from "../src/config/database";
import { crearBaseAislada } from "./database.fixture";
import { registrarPruebaCarga, actualizarPruebaCarga, finalizarPruebaCarga } from "../src/repositorios/telemetria.repository";
import { consultarMetricas, obtenerMetricasProceso } from "../src/monitoreo/metricas";

test("telemetría de carga compartida entre procesos y conservada al finalizar", async () => {
  const limpiar=await crearBaseAislada();
  const externa=new Pool({...pool.options,max:1});
  try {
    const id=randomUUID();
    await registrarPruebaCarga({id,estudiantes:2000,cupos:30,conexiones:128,pausaMs:0,pid:123},externa);
    await actualizarPruebaCarga(id,"ejecutando",
      {recibidas:2000,pendientes:1000,procesando:4,confirmadas:30,rechazadas:966},
      obtenerMetricasProceso(),externa);
    let metricas=await consultarMetricas();
    assert.equal(metricas.confirmadas,0);
    assert.equal(metricas.pruebasCarga.length,1);
    assert.equal(metricas.pruebasCarga[0].progreso.confirmadas,30);
    assert.equal(metricas.pruebasCarga[0].progreso.pendientes,1000);
    await externa.query("UPDATE telemetria_pruebas_carga SET actualizada_en=clock_timestamp()-interval '1 minute' WHERE id=$1",[id]);
    metricas=await consultarMetricas();
    assert.equal(metricas.pruebasCarga[0].sinActualizacion,true);
    await finalizarPruebaCarga(id,true,{correcto:true,duplicadas:0},"Terminada",externa);
    metricas=await consultarMetricas();
    assert.equal(metricas.pruebasCarga[0].estado,"completada");
    assert.equal(metricas.pruebasCarga[0].resultado.correcto,true);
    assert.equal(metricas.pruebasCarga[0].sinActualizacion,false);
    // La telemetría es independiente de las solicitudes académicas.
    assert.equal((await pool.query("SELECT count(*)::integer AS n FROM solicitudes_matricula")).rows[0].n,0);
  } finally {
    await externa.end();
    await limpiar();
    await pool.end();
  }
});
