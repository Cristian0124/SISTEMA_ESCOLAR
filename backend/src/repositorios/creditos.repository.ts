import { pool } from "../config/database";

export interface ResumenCreditos {
  creditosPrograma: number;
  semestre: number;
  creditosBase: number;
  creditosMatriculados: number;
  creditosExtra: number;
  creditosDisponibles: number;
  periodo: string;
}

export interface SolicitudCreditos {
  id: number;
  usuarioId: number;
  nombreEstudiante: string;
  cedula: string;
  periodo: string;
  creditos: number;
  motivo: string;
  estado: "Pendiente" | "Aprobada" | "Rechazada";
  solicitadoEn: Date;
  revisadoEn: Date | null;
}

export type SolicitudCreditosEstudiante = Pick<SolicitudCreditos, "id" | "periodo" | "creditos" | "motivo" | "estado" | "solicitadoEn" | "revisadoEn">;

const periodoActual = `to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END`;

export async function obtenerResumenCreditos(usuarioId: number): Promise<ResumenCreditos> {
  const resultado = await pool.query<{
    creditosPrograma: number;
    semestre: number;
    creditosBase: number;
    creditosMatriculados: number;
    creditosExtra: number;
    periodo: string;
  }>(
    `WITH nivel AS (
       SELECT LEAST(COALESCE((
         SELECT MAX(materia.semestre)::integer + 1
         FROM calificaciones AS calificacion
         JOIN materias_pensum AS materia ON materia.codigo = calificacion.codigo_materia
         WHERE calificacion.usuario_id = $1 AND calificacion.nota >= 3.0 AND materia_del_programa(materia.codigo, $1)
       ), 1), (SELECT COALESCE(MAX(semestre), 1) FROM materias_pensum WHERE materia_del_programa(codigo, $1)))::integer AS semestre
     ), base AS (
       SELECT COALESCE(SUM(creditos), 0)::integer AS creditos
       FROM materias_pensum
       WHERE semestre = (SELECT semestre FROM nivel) AND materia_del_programa(codigo, $1)
     ), usados AS (
       SELECT COALESCE(SUM(materia.creditos), 0)::integer AS creditos
       FROM matriculas AS matricula
       JOIN cursos AS curso ON curso.id = matricula.curso_id
       JOIN materias_pensum AS materia ON materia.codigo = curso.codigo_pensum
       WHERE matricula.usuario_id = $1 AND matricula.estado = 'Activa'
         AND matricula.periodo = ${periodoActual}
     ), extras AS (
       SELECT COALESCE(SUM(creditos), 0)::integer AS creditos
       FROM solicitudes_creditos
       WHERE usuario_id = $1 AND periodo = ${periodoActual} AND estado = 'Aprobada'
     )
     SELECT nivel.semestre,
            (SELECT COALESCE(SUM(creditos), 0)::integer FROM materias_pensum WHERE materia_del_programa(codigo, $1)) AS "creditosPrograma",
            base.creditos AS "creditosBase",
            usados.creditos AS "creditosMatriculados",
            extras.creditos AS "creditosExtra",
            ${periodoActual} AS periodo
     FROM nivel CROSS JOIN base CROSS JOIN usados CROSS JOIN extras`,
    [usuarioId]
  );
  const resumen = resultado.rows[0];
  return {
    ...resumen,
    creditosDisponibles: Math.max(0, resumen.creditosBase + resumen.creditosExtra - resumen.creditosMatriculados)
  };
}

export async function crearSolicitudCreditos(usuarioId: number, creditos: number, motivo: string): Promise<void> {
  await pool.query(
    `INSERT INTO solicitudes_creditos (usuario_id, periodo, creditos, motivo)
     VALUES ($1, ${periodoActual}, $2, $3)`,
    [usuarioId, creditos, motivo]
  );
}

export async function tieneSolicitudPendiente(usuarioId: number): Promise<boolean> {
  const resultado = await pool.query(
    "SELECT 1 FROM solicitudes_creditos WHERE usuario_id = $1 AND periodo = " + periodoActual + " AND estado = 'Pendiente' LIMIT 1",
    [usuarioId]
  );
  return resultado.rowCount !== 0;
}

export async function obtenerUltimaSolicitudCreditos(usuarioId: number): Promise<SolicitudCreditosEstudiante | null> {
  const resultado = await pool.query<SolicitudCreditosEstudiante>(
    `SELECT id, periodo, creditos, motivo, estado,
            solicitado_en AS "solicitadoEn", revisado_en AS "revisadoEn"
     FROM solicitudes_creditos
     WHERE usuario_id = $1
     ORDER BY solicitado_en DESC, id DESC
     LIMIT 1`,
    [usuarioId]
  );
  return resultado.rows[0] ?? null;
}

export async function listarSolicitudesCreditos(): Promise<SolicitudCreditos[]> {
  const resultado = await pool.query<SolicitudCreditos>(
    `SELECT solicitud.id, solicitud.usuario_id AS "usuarioId",
            usuario.nombre AS "nombreEstudiante", usuario.cedula,
            solicitud.periodo, solicitud.creditos, solicitud.motivo,
            solicitud.estado, solicitud.solicitado_en AS "solicitadoEn",
            solicitud.revisado_en AS "revisadoEn"
     FROM solicitudes_creditos AS solicitud
     JOIN usuarios AS usuario ON usuario.id = solicitud.usuario_id
     ORDER BY CASE solicitud.estado WHEN 'Pendiente' THEN 0 ELSE 1 END,
              solicitud.solicitado_en DESC, solicitud.id DESC`
  );
  return resultado.rows;
}

export async function revisarSolicitudCreditos(
  solicitudId: number,
  estado: "Aprobada" | "Rechazada",
  administradorId: number
): Promise<boolean> {
  const resultado = await pool.query(
    `UPDATE solicitudes_creditos
     SET estado = $2, revisado_por = $3, revisado_en = NOW()
     WHERE id = $1 AND estado = 'Pendiente'
     RETURNING id`,
    [solicitudId, estado, administradorId]
  );
  return resultado.rowCount !== 0;
}
