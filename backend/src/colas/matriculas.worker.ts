import { randomUUID } from "node:crypto";
import { setTimeout as esperar } from "node:timers/promises";
import { pool } from "../config/database";
import { tomarSolicitud, fallarSolicitud } from "../repositorios/solicitudes.repository";
import { reservarCupo } from "../reservas/reservas.service";
import { recuperarSolicitudes } from "../reservas/reconciliacion";
import { crearMatricula } from "../services/matriculas.service";

export async function procesarSiguiente(): Promise<boolean> {
  const solicitud = await tomarSolicitud();
  if (!solicitud) return false;
  try {
    // Una pausa opcional hace visible el proceso en la demostración aislada.
    // Las pruebas normales y el servidor usan cero por defecto.
    const pausa = Math.min(200, Math.max(0, Number(process.env.CARGA_PAUSA_MS) || 0));
    if (pausa) await esperar(pausa);
    await reservarCupo(solicitud);
    if (pausa) await esperar(pausa);
    await crearMatricula(solicitud.usuario_id, solicitud.curso_id, { id: solicitud.id, token: solicitud.token });
    console.log(JSON.stringify({ evento: "matricula_confirmada", solicitud: solicitud.id, correlacion: solicitud.correlacion }));
  } catch (error) {
    await fallarSolicitud(solicitud, error);
    console.error(JSON.stringify({ evento: "matricula_fallida", solicitud: solicitud.id, correlacion: solicitud.correlacion,
      tipo: error instanceof Error ? error.name : "Error" }));
  }
  return true;
}
export function iniciarWorker(concurrencia = 4) {
  const id = randomUUID();
  let detenido = false;
  const controlador = new AbortController();
  async function consumir() {
    while (!detenido) {
      try {
        if (!await procesarSiguiente()) await esperar(200, undefined, { signal: controlador.signal });
      } catch (error) {
        if (detenido) break;
        console.error(JSON.stringify({ evento:"worker_error",tipo:error instanceof Error ? error.name:"Error" }));
        await esperar(1000);
      }
    }
  }
  async function mantenimiento() {
    while (!detenido) {
      try {
        await recuperarSolicitudes();
        await pool.query(
          "INSERT INTO workers_matricula(id) VALUES($1) ON CONFLICT(id) DO UPDATE SET actualizado_en=clock_timestamp()", [id]
        );
        await esperar(5000, undefined, { signal: controlador.signal });
      } catch {
        if (!detenido) await esperar(1000);
      }
    }
  }
  const tareas = [mantenimiento(), ...Array.from({ length:concurrencia }, () => consumir())];
  return async () => {
    detenido = true;
    controlador.abort();
    await Promise.all(tareas);
    await pool.query("DELETE FROM workers_matricula WHERE id=$1", [id]);
  };
}
