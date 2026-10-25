import { integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { auditoria, entrada, pk, porcentaje } from './comun';

export const insumo = pgTable('insumo', {
  id: pk(),
  tipo: text('tipo', { enum: ['MA', 'EQ', 'MO', 'TR'] }).notNull(),
  codigo: text('codigo').notNull(),
  descripcion: text('descripcion').notNull(),
  unidad: text('unidad').notNull(),
  pu: numeric('pu', entrada).notNull().default('0'),
  precioAnterior: numeric('precio_anterior', entrada),
  seccion: text('seccion'),
  orden: integer('orden').notNull().default(0),
  // Papelera: borrado lógico, el historial de precios y los APUs que lo usen se conservan.
  eliminadoEn: timestamp('eliminado_en', { withTimezone: true }),
  ...auditoria(),
});

export const historialPrecio = pgTable('historial_precio', {
  id: pk(),
  insumoId: uuid('insumo_id')
    .notNull()
    .references(() => insumo.id, { onDelete: 'cascade' }),
  puAnterior: numeric('pu_anterior', entrada),
  puNuevo: numeric('pu_nuevo', entrada).notNull(),
  usuarioId: uuid('usuario_id'),
  fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
});

export const apu = pgTable('apu', {
  id: pk(),
  codigo: text('codigo').notNull(),
  descripcion: text('descripcion').notNull(),
  unidad: text('unidad').notNull(),
  disciplina: text('disciplina'),
  rendimiento: numeric('rendimiento', entrada).notNull().default('1'),
  pctHerramientaMenor: numeric('pct_herramienta_menor', porcentaje).notNull().default('5'),
  ...auditoria(),
});

export const lineaApu = pgTable('linea_apu', {
  id: pk(),
  apuId: uuid('apu_id')
    .notNull()
    .references(() => apu.id, { onDelete: 'cascade' }),
  insumoId: uuid('insumo_id')
    .notNull()
    .references(() => insumo.id),
  cantidad: numeric('cantidad', entrada).notNull(),
  orden: integer('orden').notNull().default(0),
});
