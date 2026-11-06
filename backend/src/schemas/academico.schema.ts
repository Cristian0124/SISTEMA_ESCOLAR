import { z } from 'zod';

export const esquemaAsignacionCarrera = z.object({
  carreraCodigo: z.string().min(1).max(10),
}).strict();

export const esquemaRevisionPensum = z.object({
  version: z.string().regex(/^[0-9a-f]{64}$/),
  asignaturas: z.array(z.object({
    codigo: z.string().min(1).max(5),
    prerrequisitos: z.array(z.string().min(1).max(5)).max(1000),
  }).strict()).min(1).max(1000),
  validar: z.boolean(),
  revisionConfirmada: z.boolean(),
}).strict().refine(datos => !datos.validar || datos.revisionConfirmada, {
  message: 'Confirma que revisaste todas las asignaturas y sus prerrequisitos antes de validar el pénsum.',
  path: ['revisionConfirmada'],
});

export type RevisionPensum = z.infer<typeof esquemaRevisionPensum>;
