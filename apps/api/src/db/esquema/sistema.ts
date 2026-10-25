import { boolean, jsonb, pgTable, text, timestamp, uuid, numeric } from 'drizzle-orm/pg-core';
import { auditoria, entrada, pk, porcentaje } from './comun';

export const usuario = pgTable('usuario', {
  id: pk(),
  nombreUsuario: text('nombre_usuario').notNull().unique(),
  nombre: text('nombre').notNull(),
  claveHash: text('clave_hash').notNull(),
  rol: text('rol', { enum: ['admin', 'precios', 'cotizador', 'lector'] }).notNull(),
  disciplinas: text('disciplinas').array().notNull().default([]),
  activo: boolean('activo').notNull().default(true),
  ...auditoria(),
});

export const configEmpresa = pgTable('config_empresa', {
  id: pk(),
  nombre: text('nombre').notNull(),
  moneda: text('moneda').notNull().default('USD'),
  iva: numeric('iva', porcentaje).notNull().default('15'),
  factorMateriales: numeric('factor_materiales', entrada).notNull().default('1'),
  pctHerramientaMenor: numeric('pct_herramienta_menor', porcentaje).notNull().default('5'),
  disciplinas: jsonb('disciplinas').notNull().default([]),
  ajustes: jsonb('ajustes').notNull().default({}),
  ...auditoria(),
});

export const licencia = pgTable('licencia', {
  id: pk(),
  contenido: jsonb('contenido').notNull(),
  firma: text('firma').notNull(),
  instalacion: text('instalacion').notNull(),
  cargadaEn: timestamp('cargada_en', { withTimezone: true }).notNull().defaultNow(),
});

export const bitacora = pgTable('bitacora', {
  id: pk(),
  usuarioId: uuid('usuario_id'),
  entidad: text('entidad').notNull(),
  entidadId: uuid('entidad_id'),
  campo: text('campo'),
  antes: jsonb('antes'),
  despues: jsonb('despues'),
  fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
});
