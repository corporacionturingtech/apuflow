import { afterAll, beforeAll, expect, test } from 'vitest';
import { eq, like } from 'drizzle-orm';
import { aEntradaMotor, exportarLibro, leerLibro, type LibroEntrada } from 'excel';
import { calcularOferta } from 'motor';
import { crearApp } from '../../app';
import { crearBd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import { apu, bitacora, insumo, oferta, usuario } from '../../db/esquema';
import { crearUsuario } from '../auth/servicio';
import { configuracion } from '../insumos/repo';

const { db, pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());

const clave = 'clave-segura-1';
const P = 'IMPTEST';
let app: ReturnType<typeof crearApp>;
let galleta = '';
let galletaLector = '';
let libro: LibroEntrada;

async function entrar(nombreUsuario: string, rol: 'cotizador' | 'lector') {
  await db.delete(usuario).where(eq(usuario.nombreUsuario, nombreUsuario));
  await crearUsuario(db, { nombreUsuario, nombre: nombreUsuario, clave, rol });
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { nombreUsuario, clave },
  });
  return res.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

async function limpiar() {
  await db.delete(oferta).where(like(oferta.nombre, `${P}%`));
  await db.delete(apu).where(like(apu.codigo, `${P}%`));
  await db.delete(insumo).where(like(insumo.descripcion, `${P}%`));
}

beforeAll(async () => {
  app = crearApp(db);
  galleta = await entrar('imp-cotizador', 'cotizador');
  galletaLector = await entrar('imp-lector', 'lector');
  await limpiar();
  const cfg = await configuracion(db);
  libro = {
    datos: {
      proyecto: `${P} Subestación`,
      cliente: 'Cliente ficticio',
      tipo: 'publico',
      fecha: '2026-10-25',
      empresa: 'Demo',
    },
    factor: cfg.factorMateriales,
    iva: cfg.iva,
    herramientaMenor: cfg.pctHerramientaMenor,
    indirectos: [
      { nombre: 'Indirectos', porcentaje: '12' },
      { nombre: 'Utilidad', porcentaje: '8' },
    ],
    insumos: [
      {
        id: 'm',
        tipo: 'MA',
        descripcion: `${P} Cable`,
        unidad: 'm',
        pu: '2.5',
        seccion: 'Eléctrico',
      },
      { id: 'e', tipo: 'EQ', descripcion: `${P} Grúa`, unidad: 'h', pu: '30', seccion: null },
      { id: 'o', tipo: 'MO', descripcion: `${P} Peón`, unidad: 'h', pu: '3.5', seccion: null },
      { id: 't', tipo: 'TR', descripcion: `${P} Flete`, unidad: 'viaje', pu: '40', seccion: null },
    ],
    apus: [
      {
        id: 'a',
        codigo: `${P}-01`,
        descripcion: `${P} Tendido de cable`,
        unidad: 'm',
        disciplina: 'Eléctrica',
        rendimiento: '0.5',
        herramientaMenor: cfg.pctHerramientaMenor,
        lineas: [
          { insumoId: 'm', cantidad: '1.05' },
          { insumoId: 'e', cantidad: '1' },
          { insumoId: 'o', cantidad: '2' },
          { insumoId: 't', cantidad: '0.1' },
        ],
      },
    ],
    capitulos: [{ id: 'c', nombre: 'Cables' }],
    rubros: [
      {
        capituloId: 'c',
        apuId: 'a',
        codigo: `${P}-01`,
        cantidad: '120',
        cpc: '4640',
        origen: 'P',
        vae: '40',
      },
    ],
  };
});
afterAll(limpiar);

const enviar = async (ruta: string, cuerpo: Uint8Array, cookie = galleta) =>
  app.inject({
    method: 'POST',
    url: ruta,
    headers: {
      cookie,
      'content-type': 'application/octet-stream',
      'x-nombre-archivo': 'libro.xlsx',
    },
    payload: Buffer.from(cuerpo),
  });

test('revisar resume el libro sin escribir nada', async () => {
  const res = await enviar('/api/importar/revisar', await exportarLibro(libro));
  expect(res.statusCode).toBe(200);
  const r = res.json();
  expect(r.resumen).toMatchObject({
    insumos: 4,
    insumosNuevos: 4,
    apus: 1,
    rubros: 1,
    capitulos: 1,
  });
  expect(r.puedeConfirmar).toBe(true);
  expect(r.cuadra).toMatchObject({ hayCache: true, cuadra: true, rubrosDistintos: [] });
  expect(
    await db
      .select()
      .from(oferta)
      .where(like(oferta.nombre, `${P}%`)),
  ).toHaveLength(0);
});

test('confirmar crea la oferta idéntica (ida y vuelta) y deja bitácora', async () => {
  const res = await enviar('/api/importar/confirmar', await exportarLibro(libro));
  expect(res.statusCode).toBe(201);
  const { ofertaId } = res.json();

  const exp = await app.inject({
    method: 'GET',
    url: `/api/ofertas/${ofertaId}/exportar`,
    headers: { cookie: galleta },
  });
  const vuelta = (await leerLibro(new Uint8Array(exp.rawPayload))).libro;
  const total = (l: LibroEntrada) => calcularOferta(aEntradaMotor(l)).totales.total.toNumber();
  expect(total(vuelta)).toBe(total(libro));
  expect(vuelta.rubros[0]).toMatchObject({ cantidad: '120', cpc: '4640', origen: 'P', vae: '40' });
  expect(vuelta.indirectos.map((i) => i.nombre)).toEqual(['Indirectos', 'Utilidad']);

  const filas = await db.select().from(bitacora).where(eq(bitacora.entidadId, ofertaId));
  expect(filas.length).toBeGreaterThan(0);
});

test('un archivo que no es un libro da 400 y un lector no puede importar', async () => {
  expect((await enviar('/api/importar/revisar', new Uint8Array([1, 2, 3]))).statusCode).toBe(400);
  const res = await enviar('/api/importar/revisar', await exportarLibro(libro), galletaLector);
  expect(res.statusCode).toBe(403);
});

test('un libro con problemas bloqueantes no se confirma (422)', async () => {
  const roto = { ...libro, apus: [{ ...libro.apus[0]!, rendimiento: '-1' }] };
  const res = await enviar('/api/importar/confirmar', await exportarLibro(roto));
  expect(res.statusCode).toBe(422);
});
