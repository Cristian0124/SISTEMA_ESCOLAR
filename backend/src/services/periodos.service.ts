import { z } from "zod";
import * as repositorio from "../repositorios/periodos.repository";
import { HttpError } from "../types/http-error";

export const consultarPeriodo = repositorio.consultarPeriodo;
const esquema = z.object({
  apertura: z.string().datetime({ offset: true }),
  cierre: z.string().datetime({ offset: true }),
  habilitado: z.boolean()
}).strict().refine(p => Date.parse(p.apertura) < Date.parse(p.cierre), "La apertura debe ser anterior al cierre.");

export async function configurarPeriodo(entrada: unknown) {
  const resultado = esquema.safeParse(entrada);
  if (!resultado.success) throw new HttpError(400, "PERIODO_INVALIDO", "Revisa las fechas de apertura y cierre.");
  const { apertura,cierre,habilitado } = resultado.data;
  return repositorio.guardarPeriodo(apertura,cierre,habilitado);
}
