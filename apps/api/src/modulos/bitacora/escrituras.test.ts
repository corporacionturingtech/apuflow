import { afterAll, beforeAll, expect, test } from 'vitest';
import { eq, like } from 'drizzle-orm';
import { crearApp } from '../../app';
import { crearBd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import { bitacora, insumo, oferta, usuario } from '../../db/esquema';
import { crearUsuario } from '../auth/servicio';

const { db, pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());

// Regla dura 5: toda escritura deja bitácora. Cada ruta que escribe debe estar aquí:
// o con su comprobación en vivo (CASOS) o apuntando al test que ya la verifica (CUBIERTAS).
// Una ruta de escritura nueva rompe el primer test hasta que se agregue a una de las dos.
const CUBIERTAS: Record<string, string> = {
  'POST /api/importar/revisar': 'solo lectura: no escribe',
  'POST /api/importar/precios/revisar': 'solo lectura: no escribe',
  'POST /api/auth/login': 'sesión, no datos',
  'POST /api/auth/logout': 'sesión, no datos',
  'POST /api/ofertas/:id/presencia': 'efímera, en memoria; no es un dato',
  'PATCH /api/insumos/:id': 'insumos/rutas.test.ts',
  'POST /api/insumos/:id/eliminar': 'insumos/rutas.test.ts',
  'POST /api/insumos/:id/restaurar': 'insumos/rutas.test.ts',
  'PATCH /api/herramienta-menor': 'insumos/rutas.test.ts',
  'PATCH /api/apus/:id': 'apus/rutas.test.ts',
  'POST /api/apus/:id/lineas': 'apus/rutas.test.ts',
  'PATCH /api/apus/:id/lineas/:lineaId': 'apus/rutas.test.ts',
  'POST /api/apus/:id/lineas/:lineaId/quitar': 'apus/rutas.test.ts',
  'PATCH /api/ofertas/:id': 'ofertas/rutas.test.ts',
  'PATCH /api/ofertas/:id/indirectos/:indId': 'ofertas/rutas.test.ts',
  'PATCH /api/rubros/:id': 'ofertas/rutas.test.ts',
  'POST /api/ofertas/:id/rubros': 'ofertas/rutas.test.ts',
  'POST /api/rubros/:id/apu/copia': 'ofertas/rutas.test.ts',
  'DELETE /api/rubros/:id': 'ofertas/rutas.test.ts',
  'DELETE /api/capitulos/:id': 'ofertas/rutas.test.ts',
  'POST /api/ofertas/:id/versiones': 'ofertas/versiones.test.ts',
  'POST /api/bloques': 'bloques/rutas.test.ts',
  'POST /api/ofertas/:id/bloques': 'bloques/rutas.test.ts',
  'DELETE /api/bloques/:id': 'bloques/rutas.test.ts',
  'POST /api/importar/confirmar': 'importacion/rutas.test.ts',
  'POST /api/demo/cargar': 'demo/rutas.test.ts',
  'POST /api/importar/precios/confirmar': 'importacion/rutas.test.ts',
  'PATCH /api/usuarios/:id': 'usuarios/rutas.test.ts',
  'PUT /api/licencia': 'licencia/rutas.test.ts',
  'PUT /api/valor/parametros': 'valor/rutas.test.ts',
};

const CASOS: Record<string, (id: string, version: number) => { url: string; payload: object }> = {
  'POST /api/insumos': () => ({
    url: '/api/insumos',
    payload: { tipo: 'MA', codigo: 'TBIT-1', descripcion: 'Cable', unidad: 'm', pu: '2' },
  }),
  'POST /api/ofertas': () => ({ url: '/api/ofertas', payload: { nombre: 'TBIT-OFE' } }),
  'POST /api/ofertas/:id/capitulos': (id) => ({
    url: `/api/ofertas/${id}/capitulos`,
    payload: { nombre: 'Patio' },
  }),
  'POST /api/usuarios': () => ({
    url: '/api/usuarios',
    payload: {
      nombreUsuario: 'tbit-nuevo',
      nombre: 'Nuevo',
      clave: 'clave-segura-1',
      rol: 'lector',
    },
  }),
  'PUT /api/empresa/disciplinas': (_id, version) => ({
    url: '/api/empresa/disciplinas',
    payload: { version, disciplinas: [{ nombre: 'Civil', color: '#336699' }], restringir: false },
  }),
};

let app: ReturnType<typeof crearApp>;
let galleta = '';
let adminId = '';
const rutas = new Set<string>();

beforeAll(async () => {
  app = crearApp(db);
  app.addHook('onRoute', (r) => {
    for (const m of [r.method].flat()) {
      if (m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS') rutas.add(`${m} ${r.url}`);
    }
  });
  await app.ready();
  await db.delete(usuario).where(eq(usuario.nombreUsuario, 'tbit-nuevo'));
  await db.delete(usuario).where(eq(usuario.nombreUsuario, 'tbit-admin'));
  await crearUsuario(db, {
    nombreUsuario: 'tbit-admin',
    nombre: 'Admin bit',
    clave: 'clave-segura-1',
    rol: 'admin',
  });
  const [a] = await db.select().from(usuario).where(eq(usuario.nombreUsuario, 'tbit-admin'));
  adminId = a!.id;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { nombreUsuario: 'tbit-admin', clave: 'clave-segura-1' },
  });
  galleta = res.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  await db.delete(oferta).where(like(oferta.nombre, 'TBIT-%'));
  await db.delete(insumo).where(like(insumo.codigo, 'TBIT-%'));
});

const metodo = (clave: string) => clave.split(' ')[0] as 'POST' | 'PUT';

test('toda ruta de escritura está cubierta por un caso o por un test existente', () => {
  const sinCubrir = [...rutas].filter((r) => !(r in CASOS) && !(r in CUBIERTAS));
  expect(sinCubrir).toEqual([]);
});

test('cada escritura de CASOS deja al menos un registro de bitácora del usuario', async () => {
  const [o] = await db.insert(oferta).values({ nombre: 'TBIT-BASE', tipo: 'privado' }).returning();
  const conf = await app.inject({
    method: 'GET',
    url: '/api/empresa/disciplinas',
    headers: { cookie: galleta },
  });
  for (const [clave, armar] of Object.entries(CASOS)) {
    const antes = (await db.select().from(bitacora).where(eq(bitacora.usuarioId, adminId))).length;
    const { url, payload } = armar(o!.id, conf.json().version);
    const res = await app.inject({
      method: metodo(clave),
      url,
      headers: { cookie: galleta },
      payload,
    });
    expect(res.statusCode, `${clave}: ${res.body}`).toBeLessThan(300);
    const despues = (await db.select().from(bitacora).where(eq(bitacora.usuarioId, adminId)))
      .length;
    expect(despues, clave).toBeGreaterThan(antes);
  }
});
