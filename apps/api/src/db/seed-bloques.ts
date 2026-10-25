import { eq, like, or } from 'drizzle-orm';
import { crearBd } from './conexion';
import { apu, bloque, insumo, lineaApu, lineaBloque, oferta } from './esquema';
import { urlBd } from './url';

export const BLOQUE_E2E = 'Bahía de 230 kV';

// Bloque ficticio de un APU de $ 10 (BLQ-E2E-*) × 5 unidades: costo directo 50,00. Propio de F2-01:
// no usa LST-* (los borra seed-volumen). Borra antes las ofertas OFE-BLQ* el bloque del mismo nombre y las copias BLQ-E2E*.
export async function sembrarBloquesE2e(db: ReturnType<typeof crearBd>['db']) {
  await db.delete(oferta).where(like(oferta.nombre, 'OFE-BLQ%'));
  await db.delete(bloque).where(or(eq(bloque.nombre, BLOQUE_E2E), like(bloque.nombre, 'BLQ-E2E%')));
  await db.delete(apu).where(like(apu.codigo, 'BLQ-E2E%'));
  await db.delete(insumo).where(like(insumo.codigo, 'BLQ-E2E%'));
  const [m] = await db
    .insert(insumo)
    .values({
      tipo: 'MA',
      codigo: 'BLQ-E2E-MA',
      descripcion: 'Material de bloque ficticio',
      unidad: 'u',
      pu: '10',
    })
    .returning();
  const [a] = await db
    .insert(apu)
    .values({
      codigo: 'BLQ-E2E',
      descripcion: 'Rubro ficticio de bahía',
      unidad: 'u',
      disciplina: 'Eléctrico',
    })
    .returning();
  await db.insert(lineaApu).values({ apuId: a!.id, insumoId: m!.id, cantidad: '1' });
  const [b] = await db
    .insert(bloque)
    .values({ nombre: BLOQUE_E2E, disciplina: 'Eléctrico' })
    .returning();
  await db.insert(lineaBloque).values({ bloqueId: b!.id, apuId: a!.id, cantidad: '5', orden: 1 });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { db, pool } = crearBd(urlBd());
  await sembrarBloquesE2e(db);
  console.log('Semilla de bloques E2E lista');
  await pool.end();
}
