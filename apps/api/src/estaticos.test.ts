import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { crearApp } from './app';
import type { Bd } from './db/conexion';

test('con webDist sirve index.html, vuelve a él en rutas del router y deja /api en 404 JSON', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'web-'));
  writeFileSync(join(dir, 'index.html'), '<title>Turing APU</title>');
  const app = crearApp({} as Bd, { webDist: dir });
  expect((await app.inject('/')).body).toContain('Turing APU');
  expect((await app.inject('/ofertas/123')).body).toContain('Turing APU');
  const api = await app.inject('/api/no-existe');
  expect(api.statusCode).toBe(404);
  expect(api.json().mensaje).toBe('No encontrado');
});
