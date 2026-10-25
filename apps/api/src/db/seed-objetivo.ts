import { like } from 'drizzle-orm';
import { crearBd } from './conexion';
import { apu, capitulo, indirecto, insumo, lineaApu, oferta, rubro } from './esquema';
import { urlBd } from './url';

// Oferta ficticia para el e2e de F3-01: tres rubros de CU 10, 20 y 70 sin indirectos → subtotal
// $ 100,00; el rubro de más peso es OBJ-E2E-3. Prefijo propio (OBJ-E2E) por los e2e en paralelo.
export const NOMBRE_OFERTA_OBJ = 'OBJ-E2E Oferta de objetivo';

export async function sembrarObjetivoE2e(db: ReturnType<typeof crearBd>['db']) {
  await db.delete(oferta).where(like(oferta.nombre, 'OBJ-E2E%'));
  await db.delete(apu).where(like(apu.codigo, 'OBJ-E2E%'));
  await db.delete(insumo).where(like(insumo.codigo, 'OBJ-E2E%'));
  const [o] = await db
    .insert(oferta)
    .values({ nombre: NOMBRE_OFERTA_OBJ, cliente: 'Cliente ficticio', tipo: 'privado' })
    .returning();
  const [cap] = await db
    .insert(capitulo)
    .values({ ofertaId: o!.id, nombre: 'Capítulo ficticio', orden: 1 })
    .returning();
  for (const [i, pu] of [10, 20, 70].entries()) {
    const n = i + 1;
    const [m] = await db
      .insert(insumo)
      .values({
        tipo: 'MA',
        codigo: `OBJ-E2E-MA${n}`,
        descripcion: 'Material ficticio',
        unidad: 'u',
        pu: String(pu),
      })
      .returning();
    const [a] = await db
      .insert(apu)
      .values({ codigo: `OBJ-E2E-${n}`, descripcion: `Rubro ficticio ${n}`, unidad: 'u' })
      .returning();
    await db.insert(lineaApu).values({ apuId: a!.id, insumoId: m!.id, cantidad: '1' });
    await db.insert(rubro).values({
      ofertaId: o!.id,
      capituloId: cap!.id,
      apuId: a!.id,
      codigo: `OBJ-E2E-${n}`,
      cantidad: '1',
      orden: n,
    });
  }
  await db
    .insert(indirecto)
    .values({ ofertaId: o!.id, nombre: 'Utilidad', porcentaje: '0', esUtilidad: true, orden: 1 });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { db, pool } = crearBd(urlBd());
  await sembrarObjetivoE2e(db);
  console.log('Oferta de objetivo E2E sembrada');
  await pool.end();
}
