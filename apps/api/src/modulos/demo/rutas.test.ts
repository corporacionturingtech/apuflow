import { afterAll, expect, test } from 'vitest';
import { crearApp } from '../../app';
import { crearBd, type Bd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import { crearUsuario } from '../auth/servicio';
import { NOMBRE_DEMO, nombreDemo } from './servicio';

const { db, pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());

class Deshacer extends Error {}

// En una transacción que se revierte: la demo crea insumos y APUs globales.
test('demo: solo admin, crea oferta y bloques, y repetir no duplica', async () => {
  await expect(
    db.transaction(async (tx) => {
      const t = tx as unknown as Bd;
      for (const [u, rol] of [
        ['tdemo-admin', 'admin'],
        ['tdemo-cot', 'cotizador'],
      ] as const)
        await crearUsuario(t, { nombreUsuario: u, nombre: u, clave: 'clave-segura-1', rol });
      const app = crearApp(t);
      const entrar = async (u: string) => {
        const r = await app.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: { nombreUsuario: u, clave: 'clave-segura-1' },
        });
        return r.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
      };
      const pedir = (cookie: string, method: 'GET' | 'POST', url: string) =>
        app.inject({ method, url, headers: { cookie } });

      expect((await pedir(await entrar('tdemo-cot'), 'POST', '/api/demo/cargar')).statusCode).toBe(
        403,
      );

      const admin = await entrar('tdemo-admin');
      expect((await pedir(admin, 'GET', '/api/demo')).json()).toEqual({ ofertaId: null });
      const a = await pedir(admin, 'POST', '/api/demo/cargar');
      expect(a.statusCode).toBe(201);
      const oferta = (await pedir(admin, 'GET', `/api/ofertas/${a.json().ofertaId}`)).json();
      expect(oferta.nombre).toBe(NOMBRE_DEMO);
      expect(oferta.capitulos).toHaveLength(1);
      expect(oferta.rubros.length).toBeGreaterThan(0);
      const bloques = (await pedir(admin, 'GET', '/api/bloques')).json();
      expect(bloques.items.length).toBeGreaterThanOrEqual(4);

      expect((await pedir(admin, 'GET', '/api/demo')).json()).toEqual({
        ofertaId: a.json().ofertaId,
      });
      const b = await pedir(admin, 'POST', '/api/demo/cargar');
      expect(b.statusCode).toBe(200);
      expect(b.json()).toEqual({ ofertaId: a.json().ofertaId, creada: false });
      throw new Deshacer();
    }),
  ).rejects.toBeInstanceOf(Deshacer);
});

test('demo de vivienda: se carga junto a la eléctrica, privada y con sus 8 bloques', async () => {
  await expect(
    db.transaction(async (tx) => {
      const t = tx as unknown as Bd;
      await crearUsuario(t, {
        nombreUsuario: 'tdemo-viv',
        nombre: 'V',
        clave: 'clave-segura-1',
        rol: 'admin',
      });
      const app = crearApp(t);
      const login = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { nombreUsuario: 'tdemo-viv', clave: 'clave-segura-1' },
      });
      const cookie = login.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
      const pedir = (method: 'GET' | 'POST', url: string, payload?: object) =>
        app.inject({ method, url, headers: { cookie }, payload });

      expect((await pedir('POST', '/api/demo/cargar', { sector: 'minería' })).statusCode).toBe(400);
      const antes = (await pedir('GET', '/api/bloques')).json().items.length;
      const v = await pedir('POST', '/api/demo/cargar', { sector: 'vivienda' });
      expect(v.statusCode).toBe(201);
      const oferta = (await pedir('GET', `/api/ofertas/${v.json().ofertaId}`)).json();
      expect(oferta.nombre).toBe(nombreDemo('vivienda'));
      expect(oferta.tipo).toBe('privado');
      expect(oferta.capitulos).toHaveLength(1);
      const bloques = (await pedir('GET', '/api/bloques')).json().items;
      expect(bloques.length - antes).toBe(8);
      const cubierta = bloques.find(
        (b: { nombre: string }) => b.nombre === 'Cubierta de teja española',
      );
      expect([cubierta.tamano, cubierta.unidadTamano]).toEqual(['50.000000', 'm²']);
      expect((await pedir('GET', '/api/demo')).json()).toEqual({ ofertaId: v.json().ofertaId });

      // Escalar: la obra gris es para 100 m²; para 150 m² cada cantidad sube 1,5 veces.
      const og = bloques.find((b: { tamano: string | null }) => b.tamano === '100.000000');
      const base = Number(og.lineas.find(Boolean).cantidad);
      const ins = await pedir('POST', `/api/ofertas/${v.json().ofertaId}/bloques`, {
        bloqueId: og.id,
        tamano: '150',
      });
      expect(ins.statusCode).toBe(201);
      const cap = ins
        .json()
        .oferta.capitulos.find((c: { id: string }) => c.id === ins.json().capituloId);
      expect(cap.nombre).toBe(`${og.nombre} · 150 m²`);
      const primero = ins
        .json()
        .oferta.rubros.filter((r: { capituloId: string }) => r.capituloId === cap.id)
        .sort((a: { orden: number }, b: { orden: number }) => a.orden - b.orden)[0];
      expect(Number(primero.cantidad)).toBe(base * 1.5);

      // Repetir no duplica; la eléctrica se puede cargar aparte.
      expect((await pedir('POST', '/api/demo/cargar', { sector: 'vivienda' })).statusCode).toBe(
        200,
      );
      const e = await pedir('POST', '/api/demo/cargar');
      expect(e.statusCode).toBe(201);
      // Un bloque sin tamaño no acepta «tamano», sí «veces».
      const sinTamano = (await pedir('GET', '/api/bloques'))
        .json()
        .items.find((b: { tamano: string | null }) => !b.tamano);
      expect(
        (
          await pedir('POST', `/api/ofertas/${e.json().ofertaId}/bloques`, {
            bloqueId: sinTamano.id,
            tamano: '2',
          })
        ).statusCode,
      ).toBe(400);
      expect((await pedir('GET', `/api/ofertas/${e.json().ofertaId}`)).json().nombre).toBe(
        NOMBRE_DEMO,
      );
      throw new Deshacer();
    }),
  ).rejects.toBeInstanceOf(Deshacer);
});
