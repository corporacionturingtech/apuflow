import { integer, timestamp, uuid } from 'drizzle-orm/pg-core';

export const pk = () => uuid('id').primaryKey().defaultRandom();

// Bloqueo optimista (409 si `version` no coincide) y rastro de quién tocó por última vez.
export const auditoria = () => ({
  version: integer('version').notNull().default(1),
  actualizadoPor: uuid('actualizado_por'),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
});

export const entrada = { precision: 18, scale: 6 } as const;
export const resultado = { precision: 18, scale: 2 } as const;
export const porcentaje = { precision: 9, scale: 4 } as const;
