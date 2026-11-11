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

// Usa la fecha de PostgreSQL para formar el periodo. Enero a junio usan -1 y julio a diciembre, -2.
const periodoActual = `to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END`;

export async function obtenerResumenCreditos(usuarioId: number): Promise<ResumenCreditos> {
  // WITH divide el resumen del estudiante $1 en cuatro cálculos de una fila:
  // nivel toma el mayor semestre con una materia aprobada, suma uno y lo limita al último del plan.
  // base suma los créditos de ese semestre. usados suma las matrículas activas del periodo.
  // extras suma solo las solicitudes aprobadas del periodo. CROSS JOIN reúne los totales.
  // TypeScript calcula los disponibles como base más extras menos usados, con mínimo cero.
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
         JOIN plan_del_estudiante($1) AS materia ON materia.codigo = calificacion.codigo_materia
         WHERE calificacion.usuario_id = $1 AND calificacion.nota >= 3.0
       ), 1), (SELECT COALESCE(MAX(semestre), 1) FROM plan_del_estudiante($1)))::integer AS semestre
     ), base AS (
       SELECT COALESCE(SUM(creditos), 0)::integer AS creditos
       FROM plan_del_estudiante($1)
       WHERE semestre = (SELECT semestre FROM nivel)
     ), usados AS (
       SELECT COALESCE(SUM(materia.creditos), 0)::integer AS creditos
       FROM matriculas AS matricula
       JOIN cursos AS curso ON curso.id = matricula.curso_id
       JOIN plan_del_estudiante($1) AS materia ON materia.codigo = curso.codigo_pensum
       WHERE matricula.usuario_id = $1 AND matricula.estado = 'Activa'
         AND matricula.periodo = ${periodoActual}
     ), extras AS (
       SELECT COALESCE(SUM(creditos), 0)::integer AS creditos
       FROM solicitudes_creditos
       WHERE usuario_id = $1 AND periodo = ${periodoActual} AND estado = 'Aprobada'
     )
     SELECT nivel.semestre,
            (SELECT COALESCE(SUM(creditos), 0)::integer FROM plan_del_estudiante($1)) AS "creditosPrograma",
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

