import { pool } from "../config/database";

export interface SolicitudSoporteDocente {
  id: number;
  mensaje: string;
  creadoEn: Date;
  respuesta: string | null;
  respondidoEn: Date | null;
}

export interface SolicitudSoporteAdmin extends SolicitudSoporteDocente {
  usuarioId: number;
  nombreProfesor: string;
  correoProfesor: string;
}

export async function listarSolicitudesDelProfesor(usuarioId: number): Promise<SolicitudSoporteDocente[]> {
  const resultado = await pool.query<SolicitudSoporteDocente>(
    `SELECT id, mensaje, creado_en AS "creadoEn", respuesta,
            respondido_en AS "respondidoEn"
     FROM solicitudes_soporte
     WHERE usuario_id = $1
     ORDER BY creado_en DESC, id DESC`,
    [usuarioId]
  );
  return resultado.rows;
}

export async function crearSolicitudSoporte(usuarioId: number, mensaje: string): Promise<void> {
  await pool.query(
    "INSERT INTO solicitudes_soporte (usuario_id, mensaje) VALUES ($1, $2)",
    [usuarioId, mensaje]
  );
}

export async function listarSolicitudesSoporte(): Promise<SolicitudSoporteAdmin[]> {
  const resultado = await pool.query<SolicitudSoporteAdmin>(
    `SELECT solicitud.id, solicitud.usuario_id AS "usuarioId",
            usuario.nombre AS "nombreProfesor", usuario.correo AS "correoProfesor",
            solicitud.mensaje, solicitud.creado_en AS "creadoEn",
            solicitud.respuesta, solicitud.respondido_en AS "respondidoEn"
     FROM solicitudes_soporte AS solicitud
     JOIN usuarios AS usuario ON usuario.id = solicitud.usuario_id
     ORDER BY CASE WHEN solicitud.respuesta IS NULL THEN 0 ELSE 1 END,
              solicitud.creado_en DESC, solicitud.id DESC`
  );
  return resultado.rows;
}

export async function responderSolicitudSoporte(
  solicitudId: number,
  administradorId: number,
  respuesta: string
): Promise<boolean> {
  const resultado = await pool.query(
    `UPDATE solicitudes_soporte
     SET respuesta = $3, respondida_por = $2, respondido_en = NOW()
     WHERE id = $1 AND respuesta IS NULL
     RETURNING id`,
    [solicitudId, administradorId, respuesta]
  );
  return resultado.rowCount !== 0;
}
