import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { and, eq, inArray, like } from 'drizzle-orm';
import { crearApp } from '../../app';
import { crearBd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import {
  apu,
  bitacora,
  capitulo,
  insumo,
  lineaApu,
  oferta,
  rubro,
  usuario,
} from '../../db/esquema';
import { crearUsuario } from '../auth/servicio';

const { db, pool } = crearBd(urlBdPruebas());
const clave = 'clave-segura-1';
const app = crearApp(db);

let admin = '';
let cotizadorSinRol = '';
let capElectrico = '';
let rubroCivil = '';
let rubroElectrico = '';

const pedir = (
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  url: string,
  galleta: string,
  payload?: object,
) => app.inject({ method, url, headers: { cookie: galleta }, payload });

async function entrar(nombreUsuario: string, clavePlana = clave) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { nombreUsuario, clave: clavePlana },
  });
  return res.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

const restringir = async (restringir: boolean) => {
  const actual = (await pedir('GET', '/api/empresa/disciplinas', admin)).json();
  const r = await pedir('PUT', '/api/empresa/disciplinas', admin, {
    version: actual.version,
    disciplinas: [
      { nombre: 'Civil', color: '#d97706' },
      { nombre: 'Eléctrico', color: '#2563eb' },
    ],
    restringir,
  });
  expect(r.statusCode).toBe(200);
};

beforeAll(async () => {
  await db.delete(usuario).where(like(usuario.nombreUsuario, 'tusu-%'));
  await crearUsuario(db, { nombreUsuario: 'tusu-admin', nombre: 'Admin', clave, rol: 'admin' });
  await crearUsuario(db, { nombreUsuario: 'tusu-plano', nombre: 'Plano', clave, rol: 'cotizador' });
  admin = await entrar('tusu-admin');
  cotizadorSinRol = await entrar('tusu-plano');
});

afterAll(async () => {
  await restringir(false);
  await pool.end();
});

beforeEach(async () => {
  await db.delete(oferta).where(like(oferta.nombre, 'TUSU-%'));
  await db.delete(apu).where(like(apu.codigo, 'TUSU-%'));
  await db.delete(insumo).where(like(insumo.codigo, 'TUSU-%'));
  const [i] = await db
    .insert(insumo)
    .values({ tipo: 'MO', codigo: 'TUSU-MO1', descripcion: 'Ayudante', unidad: 'hora', pu: '3' })
    .returning();
  const [a] = await db
    .insert(apu)
    .values({ codigo: 'TUSU-1', descripcion: 'Montaje', unidad: 'u', rendimiento: '2' })
    .returning();
  await db.insert(lineaApu).values({ apuId: a!.id, insumoId: i!.id, cantidad: '1' });
  const [o] = await db.insert(oferta).values({ nombre: 'TUSU-1', tipo: 'publico' }).returning();
  const caps = await db
    .insert(capitulo)
    .values([
      { ofertaId: o!.id, nombre: 'Obra civil', disciplina: 'Civil', orden: 1 },
      { ofertaId: o!.id, nombre: 'Montaje', disciplina: 'Eléctrico', orden: 2 },
    ])
    .returning();
  capElectrico = caps[1]!.id;
  const rs = await db
    .insert(rubro)
    .values(
      caps.map((c, n) => ({
        ofertaId: o!.id,
        capituloId: c.id,
        apuId: a!.id,
        codigo: `R${n}`,
        cantidad: '10',
      })),
    )
    .returning();
  rubroCivil = rs[0]!.id;
  rubroElectrico = rs[1]!.id;
});

test('solo el admin gestiona usuarios', async () => {
  expect((await pedir('GET', '/api/usuarios', cotizadorSinRol)).statusCode).toBe(403);
  expect((await pedir('POST', '/api/usuarios', cotizadorSinRol, {})).statusCode).toBe(403);
  const lista = (await pedir('GET', '/api/usuarios', admin)).json().usuarios;
  expect(lista.map((u: { nombreUsuario: string }) => u.nombreUsuario)).toContain('tusu-admin');
  expect(JSON.stringify(lista)).not.toContain('claveHash');
});

test('crear, cambiar rol, 409 por versión y bitácora', async () => {
  const nuevo = {
    nombreUsuario: 'tusu-ana',
    nombre: 'Ana',
    clave,
    rol: 'cotizador',
    disciplinas: ['Civil'],
  };
  await db.delete(usuario).where(eq(usuario.nombreUsuario, 'tusu-ana'));
  const c = await pedir('POST', '/api/usuarios', admin, nuevo);
  expect(c.statusCode).toBe(201);
  const u = c.json();
  expect(u).toMatchObject({ rol: 'cotizador', disciplinas: ['Civil'], activo: true, version: 1 });
  expect((await pedir('POST', '/api/usuarios', admin, nuevo)).statusCode).toBe(409);
  expect(
    (await pedir('POST', '/api/usuarios', admin, { ...nuevo, clave: 'corta' })).statusCode,
  ).toBe(400);

  const p = await pedir('PATCH', `/api/usuarios/${u.id}`, admin, { version: 1, rol: 'lector' });
  expect(p.json()).toMatchObject({ rol: 'lector', version: 2 });
  const choque = await pedir('PATCH', `/api/usuarios/${u.id}`, admin, {
    version: 1,
    rol: 'precios',
  });
  expect(choque.statusCode).toBe(409);

  const bit = await db
    .select()
    .from(bitacora)
    .where(and(eq(bitacora.entidad, 'usuario'), eq(bitacora.entidadId, u.id)));
  expect(bit.map((b) => b.campo).sort()).toEqual([null, 'rol']);
  // La nueva clave sirve para entrar y desactivar corta el acceso.
  await pedir('PATCH', `/api/usuarios/${u.id}`, admin, { version: 2, clave: 'otra-clave-123' });
  expect(await entrar('tusu-ana', 'otra-clave-123')).toContain('sesion=');
  await pedir('PATCH', `/api/usuarios/${u.id}`, admin, { version: 3, activo: false });
  expect(await entrar('tusu-ana', 'otra-clave-123')).toBe('');
});

test('el admin no puede quitarse su propio acceso', async () => {
  const yo = (await pedir('GET', '/api/usuarios', admin))
    .json()
    .usuarios.find((u: { nombreUsuario: string }) => u.nombreUsuario === 'tusu-admin');
  const r = await pedir('PATCH', `/api/usuarios/${yo.id}`, admin, {
    version: yo.version,
    rol: 'lector',
  });
  expect(r.statusCode).toBe(403);
});

test('cotizador Civil: no edita rubros Eléctricos si la empresa lo configura', async () => {
  await db.delete(usuario).where(eq(usuario.nombreUsuario, 'tusu-civil'));
  await pedir('POST', '/api/usuarios', admin, {
    nombreUsuario: 'tusu-civil',
    nombre: 'Civil',
    clave,
    rol: 'cotizador',
    disciplinas: ['Civil'],
  });
  const civil = await entrar('tusu-civil');
  const editar = (id: string) =>
    pedir('PATCH', `/api/rubros/${id}`, civil, { version: 1, cantidad: '12' });

  await restringir(false);
  expect((await editar(rubroElectrico)).statusCode).toBe(200);

  await db.update(rubro).set({ version: 1 }).where(eq(rubro.id, rubroElectrico));
  await restringir(true);
  const bloqueado = await editar(rubroElectrico);
  expect(bloqueado.statusCode).toBe(403);
  expect(bloqueado.json().mensaje).toContain('Eléctrico');
  expect((await editar(rubroCivil)).statusCode).toBe(200);
  expect((await pedir('DELETE', `/api/rubros/${rubroElectrico}?version=1`, civil)).statusCode).toBe(
    403,
  );
  expect(
    (
      await pedir(
        'POST',
        `/api/ofertas/${(await db.select().from(capitulo).where(eq(capitulo.id, capElectrico)))[0]!.ofertaId}/capitulos`,
        civil,
        { nombre: 'X', disciplina: 'Eléctrico' },
      )
    ).statusCode,
  ).toBe(403);
  // El admin no tiene restricción.
  expect(
    (await pedir('PATCH', `/api/rubros/${rubroElectrico}`, admin, { version: 1, cantidad: '13' }))
      .statusCode,
  ).toBe(200);
  const sinFilas = await db
    .select({ id: rubro.id })
    .from(rubro)
    .where(inArray(rubro.id, [rubroElectrico]));
  expect(sinFilas).toHaveLength(1);
});
