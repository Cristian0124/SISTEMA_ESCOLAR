import { z } from 'zod';
import { HttpError } from '../types/http-error';

export const esquemaSesiones = z.array(z.object({
  dia: z.number().int().min(1).max(7),
  horaInicio: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  horaFin: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
}).strict()).min(1).max(21).superRefine((sesiones, ctx) => {
  sesiones.forEach((s,i) => {
    if (s.horaInicio >= s.horaFin) ctx.addIssue({code:'custom',path:[i,'horaFin'],message:'La hora final debe ser posterior a la inicial'});
    if (sesiones.slice(0,i).some(a=>a.dia===s.dia && a.horaInicio<s.horaFin && s.horaInicio<a.horaFin)) {
      ctx.addIssue({code:'custom',path:[i],message:'Las sesiones del grupo no pueden superponerse'});
    }
  });
});
export type SesionCurso = z.infer<typeof esquemaSesiones>[number];
const dias=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
export function normalizarSesiones(sesiones?: SesionCurso[], horario?: string): SesionCurso[] {
  if (!sesiones) {
    const partes=/^(lunes|martes|miércoles|jueves|viernes|sábado|domingo)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/i.exec(horario?.trim() ?? '');
    if (partes) sesiones=[{dia:dias.findIndex(d=>d.toLowerCase()===partes[1].toLowerCase())+1,horaInicio:partes[2].padStart(5,'0'),horaFin:partes[3].padStart(5,'0')}];
  }
  const validacion=esquemaSesiones.safeParse(sesiones);
  if (!validacion.success) throw new HttpError(400,'HORARIO_INVALIDO','Indica días y horas válidos, sin sesiones superpuestas y con hora final posterior a la inicial');
  return validacion.data.sort((a,b)=>a.dia-b.dia || a.horaInicio.localeCompare(b.horaInicio));
}
export function describirHorario(sesiones: SesionCurso[]) {
  return sesiones.map(s=>`${dias[s.dia-1]} ${s.horaInicio} - ${s.horaFin}`).join('; ');
}
