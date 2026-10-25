import { afterAll, expect, test } from 'vitest';
import { crearBd } from './conexion';
import { urlBdPruebas } from './url';

const { pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());

const TABLAS = [
  'insumo',
  'historial_precio',
  'apu',
  'linea_apu',
  'bloque',
  'linea_bloque',
  'oferta',
  'capitulo',
  'rubro',
  'indirecto',
  'version_oferta',
  'usuario',
  'bitacora',
  'config_empresa',
  'licencia',
];

test('existen las 15 tablas del modelo', async () => {
  const { rows } = await pool.query(
    "select table_name from information_schema.tables where table_schema = 'public'",
  );
  const existentes = rows.map((r) => r.table_name);
  for (const t of TABLAS) expect(existentes).toContain(t);
});

test('ninguna columna de dinero es float', async () => {
  const { rows } = await pool.query(
    "select table_name, column_name from information_schema.columns where table_schema = 'public' and data_type in ('real', 'double precision')",
  );
  expect(rows).toEqual([]);
});

test('precios y cantidades son numeric', async () => {
  const { rows } = await pool.query(
    "select data_type from information_schema.columns where table_name = 'insumo' and column_name = 'pu'",
  );
  expect(rows[0].data_type).toBe('numeric');
});

test('índice de rubros por oferta, capítulo y orden', async () => {
  const { rows } = await pool.query(
    "select indexdef from pg_indexes where tablename = 'rubro' and indexname = 'rubro_oferta_capitulo_orden'",
  );
  expect(rows[0].indexdef).toContain('(oferta_id, capitulo_id, orden)');
});
