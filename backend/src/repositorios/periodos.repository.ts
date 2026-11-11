import type { PoolClient } from "pg";
import { pool } from "../config/database";
import { HttpError } from "../types/http-error";

export const periodoActualSQL = "to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE)<=6 THEN '-1' ELSE '-2' END";
export interface PeriodoMatricula {
  codigo: string;
  apertura: Date;
  cierre: Date;
  habilitado: boolean;
  abierto: boolean;
}
const columnas = "codigo, apertura, cierre, habilitado, (habilitado AND clock_timestamp() >= apertura AND clock_timestamp() < cierre) AS abierto";

export async function consultarPeriodo() {
  const resultado = await pool.query<PeriodoMatricula>(
    `SELECT ${columnas} FROM periodos_matricula WHERE codigo = ${periodoActualSQL}`
  );
  return resultado.rows[0] ?? null;
}

export async function exigirPeriodoAbierto(cliente: Pick<PoolClient, "query"> = pool) {
  const resultado = await cliente.query<PeriodoMatricula>(
    `SELECT ${columnas} FROM periodos_matricula WHERE codigo = ${periodoActualSQL} FOR SHARE`
  );
  const periodo = resultado.rows[0];
  if (!periodo?.abierto) throw new HttpError(409, "MATRICULA_CERRADA", "La matrícula está cerrada o todavía no ha comenzado.");
  return periodo;
}

export async function guardarPeriodo(apertura: string, cierre: string, habilitado: boolean) {
  return (await pool.query<PeriodoMatricula>(
    `INSERT INTO periodos_matricula(codigo,apertura,cierre,habilitado)
     VALUES (${periodoActualSQL}, $1, $2, $3)
     ON CONFLICT(codigo) DO UPDATE SET apertura=EXCLUDED.apertura,cierre=EXCLUDED.cierre,habilitado=EXCLUDED.habilitado
     RETURNING ${columnas}`, [apertura,cierre,habilitado]
  )).rows[0];
}
