import { afterAll, expect, test } from 'vitest';
import { crearApp } from '../../app';
import { crearBd, type Bd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import { crearUsuario } from '../auth/servicio';

const { db, pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());

class Deshacer extends Error {}

type Ind = { nombre: string; porcentaje: string; esUtilidad: boolean };
const resumen = (xs: Ind[]) => xs.map((i) => [i.nombre, Number(i.porcentaje), i.esUtilidad]);

// En transacción: los indirectos por defecto son configuración global de la empresa.
test('ofertas nuevas: nacen con los indirectos por defecto de la empresa', async () => {
  await expect(
    db.transaction(async (tx) => {
      const t = tx as unknown as Bd;
      for (const [u, rol] of [
        ['tind-admin', 'admin'],
        ['tind-cot', 'cotizador'],
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
      const admin = await entrar('tind-admin');
      const cot = await entrar('tind-cot');
      const nueva = async (nombre: string) => {
        const r = await app.inject({
          method: 'POST',
          url: '/api/ofertas',
          headers: { cookie: cot },
          payload: { nombre },
        });
        expect(r.statusCode).toBe(201);
        const d = await app.inject({
          url: `/api/ofertas/${r.json().id}`,
          headers: { cookie: cot },
        });
        return resumen(d.json().indirectos);
      };

      const indirectos = [
        { nombre: 'Gastos generales', porcentaje: '12', esUtilidad: false },
        { nombre: 'Utilidad', porcentaje: '10', esUtilidad: true },
      ];
      const sinPermiso = await app.inject({
        method: 'PUT',
        url: '/api/empresa/indirectos',
        headers: { cookie: cot },
        payload: { indirectos },
      });
      expect(sinPermiso.statusCode).toBe(403);
      const ok = await app.inject({
        method: 'PUT',
        url: '/api/empresa/indirectos',
        headers: { cookie: admin },
        payload: { indirectos },
      });
      expect(ok.statusCode).toBe(200);
      expect(await nueva('TIND-con')).toEqual([
        ['Gastos generales', 12, false],
        ['Utilidad', 10, true],
      ]);
      const leidos = await app.inject({ url: '/api/empresa/indirectos', headers: { cookie: cot } });
      expect(resumen(leidos.json().indirectos)).toHaveLength(2);
      throw new Deshacer();
    }),
  ).rejects.toBeInstanceOf(Deshacer);
});

test('ofertas nuevas: sin indirectos por defecto nacen con tres filas en 0 %', async () => {
  await expect(
    db.transaction(async (tx) => {
      const t = tx as unknown as Bd;
      const { configEmpresa } = await import('../../db/esquema');
      const [c] = await tx.select().from(configEmpresa).limit(1);
      if (c) {
        const resto = { ...(c.ajustes as Record<string, unknown>) };
        delete resto.indirectosDefecto;
        await tx.update(configEmpresa).set({ ajustes: resto });
      }
      await crearUsuario(t, {
        nombreUsuario: 'tind-cot2',
        nombre: 'C',
        clave: 'clave-segura-1',
        rol: 'cotizador',
      });
      const app = crearApp(t);
      const login = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { nombreUsuario: 'tind-cot2', clave: 'clave-segura-1' },
      });
      const cookie = login.cookies.map((k) => `${k.name}=${k.value}`).join('; ');
      const r = await app.inject({
        method: 'POST',
        url: '/api/ofertas',
        headers: { cookie },
        payload: { nombre: 'TIND-sin' },
      });
      const d = await app.inject({ url: `/api/ofertas/${r.json().id}`, headers: { cookie } });
      expect(resumen(d.json().indirectos)).toEqual([
        ['Gastos generales y administrativos', 0, false],
        ['Imprevistos', 0, false],
        ['Utilidad', 0, true],
      ]);
      throw new Deshacer();
    }),
  ).rejects.toBeInstanceOf(Deshacer);
});
