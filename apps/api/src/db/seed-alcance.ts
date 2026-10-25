import { like } from 'drizzle-orm';
import { crearBd } from './conexion';
import { apu, capitulo, insumo, lineaApu, oferta, rubro } from './esquema';
import { urlBd } from './url';

// Dos ofertas ficticias que comparten un APU, para el e2e de F2-06. Prefijo propio (ALC-E2E).
export async function sembrarAlcanceE2e(db: ReturnType<typeof crearBd>['db']) {
  await db.delete(oferta).where(like(oferta.nombre, 'ALC-E2E%'));
  await db.delete(apu).where(like(apu.codigo, 'ALC-E2E%'));
  await db.delete(insumo).where(like(insumo.codigo, 'ALC-E2E%'));
  const [m] = await db
    .insert(insumo)
    .values({
      tipo: 'MA',
      codigo: 'ALC-E2E-MA',
      descripcion: 'Material ficticio',
      unidad: 'u',
      pu: '10',
    })
    .returning();
  const [a] = await db
    .insert(apu)
    .values({ codigo: 'ALC-E2E', descripcion: 'Rubro compartido ficticio', unidad: 'u' })
    .returning();
  await db.insert(lineaApu).values({ apuId: a!.id, insumoId: m!.id, cantidad: '1' });
  for (const letra of ['A', 'B']) {
    const [o] = await db
      .insert(oferta)
      .values({ nombre: `ALC-E2E Oferta ${letra}`, cliente: 'Cliente ficticio', tipo: 'privado' })
      .returning();
    const [cap] = await db
      .insert(capitulo)
      .values({ ofertaId: o!.id, nombre: 'Capítulo ficticio', orden: 1 })
      .returning();
    await db.insert(rubro).values({
      ofertaId: o!.id,
      capituloId: cap!.id,
      apuId: a!.id,
      codigo: 'R1',
      cantidad: '1',
      orden: 1,
    });
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { db, pool } = crearBd(urlBd());
  await sembrarAlcanceE2e(db);
  console.log('Ofertas de alcance E2E sembradas');
  await pool.end();
}
