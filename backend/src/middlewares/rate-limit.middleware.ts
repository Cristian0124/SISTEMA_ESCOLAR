import type { RequestHandler } from "express";
import { createHash } from "node:crypto";
import { pool } from "../config/database";

// Contadores compartidos por todas las instancias de la API.
export function limitarSolicitudes(nombre: string, maximo: number, segundos: number, porUsuario = false): RequestHandler {
  return async (req,res,next) => {
    try {
      const identidad = porUsuario ? String(res.locals.usuario?.id ?? req.ip) : req.ip ?? "local";
      const clave = nombre + ":" + createHash("sha256").update(identidad).digest("hex");
      const resultado = await pool.query<{ cantidad: number; espera: number }>(
        `INSERT INTO limites_http(clave,cantidad,vence_en) VALUES($1,1,clock_timestamp()+make_interval(secs=>$2))
         ON CONFLICT(clave) DO UPDATE SET
         cantidad=CASE WHEN limites_http.vence_en<=clock_timestamp() THEN 1 ELSE limites_http.cantidad+1 END,
         vence_en=CASE WHEN limites_http.vence_en<=clock_timestamp() THEN EXCLUDED.vence_en ELSE limites_http.vence_en END
         RETURNING cantidad, GREATEST(1,ceil(EXTRACT(EPOCH FROM vence_en-clock_timestamp())))::integer AS espera`,
        [clave,segundos]
      );
      const limite = resultado.rows[0];
      if (limite.cantidad > maximo) {
        res.setHeader("Retry-After", limite.espera);
        res.status(429).json({ codigo:"LIMITE_SOLICITUDES",mensaje:"Demasiadas solicitudes. Espera antes de reintentar." });
        return;
      }
      next();
    } catch (error) { next(error); }
  };
}
