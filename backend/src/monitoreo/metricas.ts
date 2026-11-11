import type { RequestHandler } from "express";
import { performance } from "node:perf_hooks";
import { pool } from "../config/database";

let solicitudesHttp = 0;
let erroresHttp = 0;
let duracionHttpMs = 0;
export const medirHttp: RequestHandler = (_req,res,next) => {
  const inicio = performance.now();
  res.once("finish", () => {
    solicitudesHttp++;
    duracionHttpMs += performance.now()-inicio;
    if (res.statusCode>=500) erroresHttp++;
  });
  next();
};
export async function consultarMetricas() {
  const resultado = await pool.query(
    `SELECT count(*) FILTER(WHERE estado='en_espera')::integer AS pendientes,
     count(*) FILTER(WHERE estado='procesando')::integer AS procesando,
     count(*) FILTER(WHERE estado='confirmada')::integer AS confirmadas,
     count(*) FILTER(WHERE estado='rechazada')::integer AS rechazadas,
     percentile_cont(0.95) WITHIN GROUP(ORDER BY EXTRACT(EPOCH FROM terminada_en-creada_en)*1000)
       FILTER(WHERE terminada_en IS NOT NULL) AS "latenciaP95Ms",
     (SELECT count(*)::integer FROM reservas_cupos WHERE vence_en>clock_timestamp()) AS reservas,
     (SELECT count(*)::integer FROM workers_matricula WHERE actualizado_en>clock_timestamp()-interval '15 seconds') AS workers
     FROM solicitudes_matricula WHERE creada_en>=CURRENT_DATE`
  );
  return { ...resultado.rows[0], actualizadoEn:new Date().toISOString(),
    proceso: { pid:process.pid, solicitudesHttp, erroresHttp, promedioHttpMs:solicitudesHttp ? duracionHttpMs/solicitudesHttp:0,
      memoriaMb:Math.round(process.memoryUsage().rss/1024/1024), activoSegundos:Math.floor(process.uptime()),
      conexionesBD:pool.totalCount, conexionesLibresBD:pool.idleCount, conexionesEnEsperaBD:pool.waitingCount } };
}
