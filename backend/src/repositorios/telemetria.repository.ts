import type { Pool } from "pg";
import { pool } from "../config/database";

type Conexion = Pick<Pool,"query">;
export interface ConfiguracionPruebaCarga {
  id:string;
  estudiantes:number;
  cupos:number;
  conexiones:number;
  pausaMs:number;
  pid:number;
}
export async function registrarPruebaCarga(datos:ConfiguracionPruebaCarga, cliente:Conexion = pool) {
  await cliente.query(
    `INSERT INTO telemetria_pruebas_carga(id,estado,estudiantes,cupos,conexiones,pausa_ms,pid)
     VALUES($1,'preparando',$2,$3,$4,$5,$6)`,
    [datos.id,datos.estudiantes,datos.cupos,datos.conexiones,datos.pausaMs,datos.pid]
  );
}
export async function actualizarPruebaCarga(
  id:string, estado:"preparando" | "ejecutando" | "verificando",
  progreso:object, proceso:object, cliente:Conexion = pool
) {
  await cliente.query(
    `UPDATE telemetria_pruebas_carga SET estado=$2,progreso=$3::jsonb,proceso=$4::jsonb,actualizada_en=clock_timestamp()
     WHERE id=$1 AND terminada_en IS NULL`,
    [id,estado,JSON.stringify(progreso),JSON.stringify(proceso)]
  );
}
export async function finalizarPruebaCarga(
  id:string, correcto:boolean, resultado:object | null, mensaje:string, cliente:Conexion = pool
) {
  await cliente.query(
    `UPDATE telemetria_pruebas_carga SET estado=$2,resultado=$3::jsonb,mensaje=$4,
     actualizada_en=clock_timestamp(),terminada_en=clock_timestamp() WHERE id=$1 AND terminada_en IS NULL`,
    [id,correcto ? "completada":"fallida",resultado ? JSON.stringify(resultado):null,mensaje]
  );
}
export async function listarPruebasCarga(cliente:Conexion = pool) {
  return (await cliente.query(
    `SELECT id,estado,estudiantes,cupos,conexiones,pausa_ms AS "pausaMs",pid,progreso,proceso,resultado,mensaje,
     iniciada_en AS "iniciadaEn",actualizada_en AS "actualizadaEn",terminada_en AS "terminadaEn",
     (terminada_en IS NULL AND actualizada_en<clock_timestamp()-interval '20 seconds') AS "sinActualizacion"
     FROM telemetria_pruebas_carga WHERE iniciada_en>=clock_timestamp()-interval '1 day'
     ORDER BY iniciada_en DESC LIMIT 5`
  )).rows;
}
