import { afterAll, expect, test } from 'vitest';
import { esquemaSalud } from 'tipos';
import { crearApp } from '../../app';
import { crearBd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';

const { db, pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());

test('GET /api/salud responde ok con la BD conectada', async () => {
  const res = await crearApp(db).inject({ method: 'GET', url: '/api/salud' });
  expect(res.statusCode).toBe(200);
  expect(esquemaSalud.parse(res.json())).toEqual({ estado: 'ok', bd: true });
});
