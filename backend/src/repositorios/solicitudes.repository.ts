import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../config/database";
import { exigirPeriodoAbierto } from "./periodos.repository";
import { HttpError } from "../types/http-error";

export interface SolicitudMatricula {
  id: string;
  usuario_id: number;
  curso_id: number;
  periodo: string;
  estado: "en_espera" | "procesando" | "confirmada" | "rechazada";
  token: string;
  intentos: number;
  correlacion: string;
  motivo: string | null;
  matricula_id: number | null;
  codigo_error: string | null;
}
export interface ContextoSolicitud { id: string; token: string }
export async function encolarSolicitud(usuarioId: number, cursoId: number, clave: string, correlacion: string) {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query("SET LOCAL statement_timeout = '15s'");
    // El bloqueo compartido del periodo evita encolar durante un cambio concurrente de apertura.
    const previa = (await cliente.query<SolicitudMatricula>(
      "SELECT * FROM solicitudes_matricula WHERE usuario_id=$1 AND clave=$2", [usuarioId,clave]
    )).rows[0];
    if (previa) {
      if (previa.curso_id !== cursoId) throw new HttpError(409,"CLAVE_REUTILIZADA","Esta clave corresponde a otro curso.");
      await cliente.query("COMMIT");
      return previa;
    }
    const periodo = await exigirPeriodoAbierto(cliente);
    // Serializa los envíos del mismo estudiante para resolver duplicados sin abortar la transacción.
    await cliente.query("SELECT pg_advisory_xact_lock(20261111, $1::integer)", [usuarioId]);
    const insertada = await cliente.query<SolicitudMatricula>(
      `INSERT INTO solicitudes_matricula(id,usuario_id,curso_id,periodo,clave,correlacion)
       VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING *`,
      [randomUUID(),usuarioId,cursoId,periodo.codigo,clave,correlacion]
    );
    const solicitud = insertada.rows[0] ?? (await cliente.query<SolicitudMatricula>(
      `SELECT * FROM solicitudes_matricula WHERE usuario_id=$1 AND
       (clave=$2 OR (curso_id=$3 AND periodo=$4 AND estado IN ('en_espera','procesando')))
       ORDER BY (clave=$2) DESC LIMIT 1`, [usuarioId,clave,cursoId,periodo.codigo]
    )).rows[0];
    if (!solicitud || solicitud.curso_id !== cursoId) throw new HttpError(409,"CLAVE_REUTILIZADA","Reintenta con una clave nueva.");
    await cliente.query("COMMIT");
    return solicitud;
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally { cliente.release(); }
}

export async function listarSolicitudes(usuarioId: number) {
  return (await pool.query(
    `SELECT s.id,s.curso_id,s.estado,s.motivo,s.codigo_error,s.matricula_id,s.creada_en,
       c.codigo AS curso_codigo,m.nombre AS materia
     FROM solicitudes_matricula s JOIN cursos c ON c.id=s.curso_id
     JOIN materias m ON m.codigo=c.codigo_pensum
     WHERE s.usuario_id=$1 ORDER BY s.creada_en DESC LIMIT 200`, [usuarioId]
  )).rows;
}
export async function consultarSolicitud(id: string, usuarioId: number) {
  return (await pool.query(
    `SELECT id,curso_id,estado,motivo,codigo_error,matricula_id,creada_en,terminada_en
     FROM solicitudes_matricula WHERE id=$1 AND usuario_id=$2`, [id,usuarioId]
  )).rows[0] ?? null;
}

// El token cambia en cada intento y cerca al trabajador anterior si vence su arrendamiento.
export async function tomarSolicitud(): Promise<SolicitudMatricula | null> {
  const resultado = await pool.query<SolicitudMatricula>(
    `UPDATE solicitudes_matricula s SET estado='procesando',token=$1,
       vence_en=clock_timestamp()+interval '60 seconds',intentos=s.intentos+1
     FROM (SELECT id FROM solicitudes_matricula WHERE estado='en_espera' AND disponible_en<=clock_timestamp()
       ORDER BY disponible_en,creada_en FOR UPDATE SKIP LOCKED LIMIT 1) siguiente
     WHERE s.id=siguiente.id RETURNING s.*`, [randomUUID()]
  );
  return resultado.rows[0] ?? null;
}
export async function validarArrendamiento(cliente: PoolClient, contexto: ContextoSolicitud) {
  await exigirPeriodoAbierto(cliente);
  const resultado = await cliente.query(
    `SELECT id FROM solicitudes_matricula WHERE id=$1 AND token=$2 AND estado='procesando'
     AND vence_en>clock_timestamp() AND periodo=to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE)<=6 THEN '-1' ELSE '-2' END FOR UPDATE`, [contexto.id,contexto.token]
  );
  if (!resultado.rowCount) throw new Error("ARRENDAMIENTO_VENCIDO");
}
export async function confirmarSolicitud(cliente: PoolClient, contexto: ContextoSolicitud, matriculaId: number) {
  const actualizada = await cliente.query(
    `UPDATE solicitudes_matricula s SET estado='confirmada',matricula_id=$3,terminada_en=clock_timestamp(),vence_en=NULL
     WHERE s.id=$1 AND s.token=$2 AND s.estado='procesando' AND s.vence_en>clock_timestamp()
       AND EXISTS (SELECT 1 FROM reservas_cupos r WHERE r.solicitud_id=s.id AND r.token=$2 AND r.vence_en>clock_timestamp())
     RETURNING id`, [contexto.id,contexto.token,matriculaId]
  );
  if (!actualizada.rowCount) throw new Error("RESERVA_VENCIDA");
  await cliente.query("DELETE FROM reservas_cupos WHERE solicitud_id=$1 AND token=$2", [contexto.id,contexto.token]);
}
export async function fallarSolicitud(solicitud: SolicitudMatricula, error: unknown) {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const definitiva = error instanceof HttpError || solicitud.intentos >= 10;
    const motivo = error instanceof HttpError ? error.message : "No fue posible completar la operación tras varios intentos.";
    const codigo = error instanceof HttpError ? error.codigo : "PROCESAMIENTO_FALLIDO";
    const resultado = await cliente.query(
      `UPDATE solicitudes_matricula SET estado=$3,motivo=$4,codigo_error=$5,
       terminada_en=CASE WHEN $3='rechazada' THEN clock_timestamp() ELSE NULL END,
       disponible_en=clock_timestamp()+interval '1 second' * LEAST(30,intentos*2),vence_en=NULL
       WHERE id=$1 AND token=$2 AND estado='procesando' RETURNING id`,
      [solicitud.id,solicitud.token,definitiva ? "rechazada":"en_espera",definitiva ? motivo:null,definitiva ? codigo:null]
    );
    if (resultado.rowCount) await cliente.query(
      "DELETE FROM reservas_cupos WHERE solicitud_id=$1 AND token=$2", [solicitud.id,solicitud.token]
    );
    await cliente.query("COMMIT");
  } catch (error) { await cliente.query("ROLLBACK"); throw error; }
  finally { cliente.release(); }
}
