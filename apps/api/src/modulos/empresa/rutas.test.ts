import { afterAll, expect, test } from 'vitest';
import { crearApp } from '../../app';
import { crearBd, type Bd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import { crearUsuario } from '../auth/servicio';

const { db, pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());

class Deshacer extends Error {}

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

test('empresa: solo admin cambia, valida, respeta version y el IVA nuevo llega a las ofertas', async () => {
  await expect(
    db.transaction(async (tx) => {
      const t = tx as unknown as Bd;
      for (const [u, rol] of [
        ['temp-admin', 'admin'],
        ['temp-cot', 'cotizador'],
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
      const admin = await entrar('temp-admin');
      const cot = await entrar('temp-cot');
      const pedir = (
        cookie: string,
        method: 'GET' | 'POST' | 'PUT',
        url: string,
        payload?: object,
      ) => app.inject({ method, url, headers: { cookie }, payload });

      expect((await app.inject({ method: 'GET', url: '/api/empresa' })).statusCode).toBe(401);
      const e0 = (await pedir(cot, 'GET', '/api/empresa')).json();
      expect(e0.formatoNumero).toBe('es');
      const cambio = {
        version: e0.version,
        nombre: 'Constructora Andina',
        iva: '18',
        moneda: 'pen',
        formatoNumero: 'en',
        acento: '#0f766e',
        logo: PNG,
        tipoOfertaDefecto: 'publico',
      };
      expect((await pedir(cot, 'PUT', '/api/empresa', cambio)).statusCode).toBe(403);
      for (const malo of [
        { iva: '150' },
        { acento: 'rojo' },
        { logo: 'data:text/html;base64,AA==' },
      ])
        expect((await pedir(admin, 'PUT', '/api/empresa', { ...cambio, ...malo })).statusCode).toBe(
          400,
        );

      const o = (await pedir(admin, 'POST', '/api/ofertas', { nombre: 'OFE-EMP prueba' })).json();
      expect(o.tipo).toBe('privado');
      const ok = await pedir(admin, 'PUT', '/api/empresa', cambio);
      expect(ok.statusCode).toBe(200);
      expect(ok.json()).toMatchObject({ iva: '18.0000', moneda: 'PEN', acento: '#0f766e' });
      expect((await pedir(admin, 'PUT', '/api/empresa', cambio)).statusCode).toBe(409);

      const det = (await pedir(admin, 'GET', `/api/ofertas/${o.id}`)).json();
      expect(Number(det.iva)).toBe(18);
      const o2 = (await pedir(admin, 'POST', '/api/ofertas', { nombre: 'OFE-EMP otra' })).json();
      expect(o2.tipo).toBe('publico');

      const b = (await pedir(admin, 'GET', '/api/bitacora?entidad=config_empresa')).json();
      expect(JSON.stringify(b)).toContain('"iva"');
      throw new Deshacer();
    }),
  ).rejects.toBeInstanceOf(Deshacer);
});
