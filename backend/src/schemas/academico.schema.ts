import { z } from 'zod';

export const esquemaAsignacionCarrera = z.object({
  carreraCodigo: z.string().min(1).max(10),
}).strict();
