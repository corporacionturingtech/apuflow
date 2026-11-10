import {
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
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

// `id` guarda el sha256 del token de la cookie: un volcado de la BD no sirve para suplantar sesiones.
export const sesion = pgTable('sesion', {
  id: text('id').primaryKey(),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuario.id, { onDelete: 'cascade' }),
  expira: timestamp('expira', { withTimezone: true }).notNull(),
  creada: timestamp('creada', { withTimezone: true }).notNull().defaultNow(),
});

// Uso de la app (ingresos y exportaciones) para los avisos por Telegram; no es un dato del negocio.
export const eventoUso = pgTable(
  'evento_uso',
  {
    id: pk(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    tipo: text('tipo', { enum: ['ingreso', 'exportacion'] }).notNull(),
    fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('evento_uso_fecha').on(t.fecha)],
);

// Un aviso por día y tipo: se reclama con ON CONFLICT DO NOTHING para no repetirlo tras un reinicio.
export const avisoEnviado = pgTable(
  'aviso_enviado',
  {
    dia: date('dia').notNull(),
    tipo: text('tipo').notNull(),
  },
  (t) => [primaryKey({ columns: [t.dia, t.tipo] })],
);
