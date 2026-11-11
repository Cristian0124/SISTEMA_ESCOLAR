import { pool } from "../config/database";
import { HttpError } from "../types/http-error";
import { validarArrendamiento, type SolicitudMatricula } from "../repositorios/solicitudes.repository";

export async function reservarCupo(solicitud: SolicitudMatricula) {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    await validarArrendamiento(cliente, { id: solicitud.id, token: solicitud.token });
    // Todos los cupos de un curso se cuentan bajo el mismo bloqueo usado para confirmar.
    const curso = (await cliente.query<{ cupos_disponibles: number }>(
      "SELECT cupos_disponibles FROM cursos WHERE id=$1 FOR UPDATE", [solicitud.curso_id]
    )).rows[0];
    if (!curso) throw new HttpError(404,"CURSO_NO_ENCONTRADO","El curso ya no existe.");
    const ocupacion = (await cliente.query<{ cantidad: number; matriculadas: number; existente: boolean }>(
      `SELECT
        (SELECT count(*)::integer FROM matriculas WHERE curso_id=$1 AND periodo=$2 AND estado='Activa') AS matriculadas,
        (SELECT count(*) FROM matriculas WHERE curso_id=$1 AND periodo=$2 AND estado='Activa')::integer +
        (SELECT count(*) FROM reservas_cupos WHERE curso_id=$1 AND periodo=$2 AND vence_en>clock_timestamp()
          AND solicitud_id<>$3)::integer AS cantidad,
        EXISTS(SELECT 1 FROM matriculas WHERE curso_id=$1 AND periodo=$2 AND usuario_id=$4) AS existente`,
      [solicitud.curso_id,solicitud.periodo,solicitud.id,solicitud.usuario_id]
    )).rows[0];
    if (!ocupacion.existente && ocupacion.cantidad >= curso.cupos_disponibles) {
      if (ocupacion.matriculadas < curso.cupos_disponibles) throw new Error("CUPOS_RESERVADOS_TEMPORALMENTE");
      throw new HttpError(409,"SIN_CUPOS","El curso ya no tiene cupos disponibles.");
    }
    await cliente.query(
      `INSERT INTO reservas_cupos(solicitud_id,curso_id,periodo,token,vence_en)
       VALUES($1,$2,$3,$4,clock_timestamp()+interval '30 seconds')
       ON CONFLICT(solicitud_id) DO UPDATE SET token=EXCLUDED.token,vence_en=EXCLUDED.vence_en`,
      [solicitud.id,solicitud.curso_id,solicitud.periodo,solicitud.token]
    );
    await cliente.query("COMMIT");
  } catch (error) { await cliente.query("ROLLBACK"); throw error; }
  finally { cliente.release(); }
}
