import { z } from 'zod';

export const esquemaSalud = z.object({
  estado: z.literal('ok'),
  bd: z.boolean(),
});

export type Salud = z.infer<typeof esquemaSalud>;
