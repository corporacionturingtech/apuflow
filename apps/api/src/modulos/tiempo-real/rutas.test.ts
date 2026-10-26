import { afterAll, beforeAll, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { crearApp } from '../../app';
import { crearBd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import { usuario } from '../../db/esquema';
import { crearUsuario } from '../auth/servicio';

const { db, pool } = crearBd(urlBdPruebas());
const app = crearApp(db);
let base = '';
let galleta = '';

beforeAll(async () => {
  await db.delete(usuario).where(eq(usuario.nombreUsuario, 'tr-cotizador'));
  await crearUsuario(db, {
    nombreUsuario: 'tr-cotizador',
    nombre: 'TR',
    clave: 'clave-segura-1',
    rol: 'cotizador',
  });
  const r = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { nombreUsuario: 'tr-cotizador', clave: 'clave-segura-1' },
  });
  galleta = r.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  base = await app.listen({ port: 0, host: '127.0.0.1' });
});
afterAll(async () => {
  await app.close();
  await pool.end();
});

test('sin sesión no hay eventos', async () => {
  const r = await fetch(`${base}/api/ofertas/x/eventos`);
  expect(r.status).toBe(401);
});

test('una escritura llega por SSE', async () => {
  const ctl = new AbortController();
  const r = await fetch(`${base}/api/ofertas/x/eventos`, {
    headers: { cookie: galleta },
    signal: ctl.signal,
  });
  expect(r.headers.get('content-type')).toContain('text/event-stream');
  const lector = r.body!.getReader();
  await lector.read(); // ": conectado"
  const o = await app.inject({
    method: 'POST',
    url: '/api/ofertas',
    headers: { cookie: galleta },
    payload: { nombre: 'TR-oferta', tipo: 'privado' },
  });
  expect(o.statusCode).toBe(201);
  const t = await lector.read();
  const texto = new TextDecoder().decode(t.value);
  expect(texto).toContain('event: cambio');
  expect(texto).toContain('"entidad":"oferta"');
  ctl.abort();
});
