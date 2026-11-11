import { pool } from "../config/database";

export async function recuperarSolicitudes() {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    // SKIP LOCKED deja terminar al worker que aún mantiene una transacción de confirmación.
    await cliente.query(
      `UPDATE solicitudes_matricula s SET estado=CASE WHEN intentos>=10 THEN 'rechazada' ELSE 'en_espera' END,
       motivo=CASE WHEN intentos>=10 THEN 'Se agotaron los intentos de procesamiento.' ELSE NULL END,
       codigo_error=CASE WHEN intentos>=10 THEN 'INTENTOS_AGOTADOS' ELSE NULL END,
       terminada_en=CASE WHEN intentos>=10 THEN clock_timestamp() ELSE NULL END,
       token=NULL,vence_en=NULL,disponible_en=clock_timestamp()
       FROM (SELECT id FROM solicitudes_matricula WHERE estado='procesando' AND vence_en<=clock_timestamp()
         FOR UPDATE SKIP LOCKED) vencida WHERE s.id=vencida.id`
    );
    await cliente.query(
      `DELETE FROM reservas_cupos r WHERE r.vence_en<=clock_timestamp()
       OR NOT EXISTS(SELECT 1 FROM solicitudes_matricula s WHERE s.id=r.solicitud_id
         AND s.estado='procesando' AND s.token=r.token)`
    );
    await cliente.query("DELETE FROM workers_matricula WHERE actualizado_en<clock_timestamp()-interval '1 day'");
    await cliente.query("DELETE FROM limites_http WHERE vence_en<clock_timestamp()");
    await cliente.query("COMMIT");
  } catch (error) { await cliente.query("ROLLBACK"); throw error; }
  finally { cliente.release(); }
}
