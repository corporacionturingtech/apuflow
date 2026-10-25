import { like } from 'drizzle-orm';
import { crearBd } from './conexion';
import { apu, capitulo, insumo, lineaApu, oferta, rubro } from './esquema';
import { urlBd } from './url';

// Material ficticio de $ 10 (IMP-E2E-MA) usado por un APU en 2 rubros de una oferta (OFE-IMP): propio de
// F2-02, no usa LST-* (los borra seed-volumen). Idempotente.
export async function sembrarImpactoE2e(db: ReturnType<typeof crearBd>['db']) {
  await db.delete(oferta).where(like(oferta.nombre, 'OFE-IMP%'));
  await db.delete(apu).where(like(apu.codigo, 'IMP-E2E%'));
  await db.delete(insumo).where(like(insumo.codigo, 'IMP-E2E%'));
  const [m] = await db
    .insert(insumo)
    .values({
      tipo: 'MA',
      codigo: 'IMP-E2E-MA',
      descripcion: 'Cobre ficticio de impacto',
      unidad: 'kg',
      pu: '10',
    })
    .returning();
  const [a] = await db
    .insert(apu)
    .values({ codigo: 'IMP-E2E', descripcion: 'Rubro ficticio de cobre', unidad: 'u' })
    .returning();
  await db.insert(lineaApu).values({ apuId: a!.id, insumoId: m!.id, cantidad: '1' });
  const [o] = await db.insert(oferta).values({ nombre: 'OFE-IMP', tipo: 'publico' }).returning();
  const [c] = await db.insert(capitulo).values({ ofertaId: o!.id, nombre: 'Cap' }).returning();
  for (const k of [1, 2])
    await db.insert(rubro).values({
      ofertaId: o!.id,
      capituloId: c!.id,
      apuId: a!.id,
      codigo: `I0${k}`,
      cantidad: '1',
      orden: k,
    });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { db, pool } = crearBd(urlBd());
  await sembrarImpactoE2e(db);
  console.log('Semilla de impacto E2E lista');
  await pool.end();
}
