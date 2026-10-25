import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { auditoria, entrada, pk, porcentaje, resultado } from './comun';
import { apu } from './precios';

export const bloque = pgTable('bloque', {
  id: pk(),
  nombre: text('nombre').notNull(),
  disciplina: text('disciplina'),
  ...auditoria(),
});

export const lineaBloque = pgTable('linea_bloque', {
  id: pk(),
  bloqueId: uuid('bloque_id')
    .notNull()
    .references(() => bloque.id, { onDelete: 'cascade' }),
  apuId: uuid('apu_id')
    .notNull()
    .references(() => apu.id),
  cantidad: numeric('cantidad', entrada).notNull(),
  orden: integer('orden').notNull().default(0),
});

export const oferta = pgTable('oferta', {
  id: pk(),
  nombre: text('nombre').notNull(),
  cliente: text('cliente'),
  tipo: text('tipo', { enum: ['publico', 'privado'] })
    .notNull()
    .default('privado'),
  estado: text('estado', { enum: ['borrador', 'emitida'] })
    .notNull()
    .default('borrador'),
  costoObjetivo: numeric('costo_objetivo', resultado),
  ...auditoria(),
});

export const capitulo = pgTable('capitulo', {
  id: pk(),
  ofertaId: uuid('oferta_id')
    .notNull()
    .references(() => oferta.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  disciplina: text('disciplina'),
  orden: integer('orden').notNull().default(0),
  ...auditoria(),
});

export const rubro = pgTable(
  'rubro',
  {
    id: pk(),
    ofertaId: uuid('oferta_id')
      .notNull()
      .references(() => oferta.id, { onDelete: 'cascade' }),
    capituloId: uuid('capitulo_id')
      .notNull()
      .references(() => capitulo.id, { onDelete: 'cascade' }),
    apuId: uuid('apu_id')
      .notNull()
      .references(() => apu.id),
    codigo: text('codigo').notNull(),
    cantidad: numeric('cantidad', entrada).notNull().default('0'),
    cpc: text('cpc'),
    origen: text('origen', { enum: ['P', 'ND', 'I'] }),
    vae: numeric('vae', porcentaje),
    orden: integer('orden').notNull().default(0),
    ...auditoria(),
  },
  (t) => [index('rubro_oferta_capitulo_orden').on(t.ofertaId, t.capituloId, t.orden)],
);

export const indirecto = pgTable('indirecto', {
  id: pk(),
  ofertaId: uuid('oferta_id')
    .notNull()
    .references(() => oferta.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  porcentaje: numeric('porcentaje', porcentaje).notNull(),
  esUtilidad: boolean('es_utilidad').notNull().default(false),
  orden: integer('orden').notNull().default(0),
  ...auditoria(),
});

export const versionOferta = pgTable('version_oferta', {
  id: pk(),
  ofertaId: uuid('oferta_id')
    .notNull()
    .references(() => oferta.id, { onDelete: 'cascade' }),
  numero: integer('numero').notNull(),
  nombre: text('nombre'),
  emitida: boolean('emitida').notNull().default(false),
  snapshot: jsonb('snapshot').notNull(),
  total: numeric('total', resultado).notNull(),
  creadaPor: uuid('creada_por'),
  creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
});
