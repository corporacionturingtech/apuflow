import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { eq, like } from 'drizzle-orm';
import { crearApp } from '../../app';
import { crearBd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import { insumo, usuario } from '../../db/esquema';
import { crearUsuario } from '../auth/servicio';

const { db, pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());

let app: ReturnType<typeof crearApp>;
let galleta = '';
let id = '';

beforeAll(async () => {
  app = crearApp(db);
  await db.delete(usuario).where(eq(usuario.nombreUsuario, 'precios-his'));
  await crearUsuario(db, {
    nombreUsuario: 'precios-his',
    nombre: 'Paula Precios',
    clave: 'clave-segura-1',
    rol: 'precios',
  });
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { nombreUsuario: 'precios-his', clave: 'clave-segura-1' },
  });
  galleta = res.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
});

beforeEach(async () => {
  await db.delete(insumo).where(like(insumo.codigo, 'THIS-%'));
  const [i] = await db
    .insert(insumo)
    .values({ tipo: 'MA', codigo: 'THIS-1', descripcion: 'Cobre', unidad: 'kg', pu: '10' })
    .returning();
  id = i!.id;
});

const cambiarPu = async (pu: string, version: number) =>
  app.inject({
    method: 'PATCH',
    url: `/api/insumos/${id}`,
    headers: { cookie: galleta },
    payload: { pu, version },
  });

test('el historial lista los cambios del más reciente al más antiguo, con usuario', async () => {
  const a = await cambiarPu('12', 1);
  expect(a.statusCode).toBe(200);
  const b = await cambiarPu('15', a.json().version);
  expect(b.statusCode).toBe(200);
  const res = await app.inject({
    method: 'GET',
    url: `/api/insumos/${id}/historial`,
    headers: { cookie: galleta },
  });
  expect(res.statusCode).toBe(200);
  const filas = res.json();
  expect(filas).toHaveLength(2);
  expect(filas.map((f: { puNuevo: string }) => Number(f.puNuevo))).toEqual([15, 12]);
  expect(Number(filas[0].puAnterior)).toBe(12);
  expect(filas[0].usuario).toBe('Paula Precios');
  expect(typeof filas[0].fecha).toBe('string');
});

test('deshacer (volver al PU anterior) deja el precio exacto y suma una fila al historial', async () => {
  const a = await cambiarPu('12', 1);
  const b = await cambiarPu(a.json().puAnterior ?? '10', a.json().version);
  expect(Number(b.json().pu)).toBe(10);
  const res = await app.inject({
    method: 'GET',
    url: `/api/insumos/${id}/historial`,
    headers: { cookie: galleta },
  });
  expect(res.json()).toHaveLength(2);
});

test('historial: 404 si el insumo no existe y 400 si el id es inválido', async () => {
  const nada = await app.inject({
    method: 'GET',
    url: '/api/insumos/00000000-0000-0000-0000-000000000000/historial',
    headers: { cookie: galleta },
  });
  expect(nada.statusCode).toBe(404);
  const mal = await app.inject({
    method: 'GET',
    url: '/api/insumos/xyz/historial',
    headers: { cookie: galleta },
  });
  expect(mal.statusCode).toBe(400);
});
