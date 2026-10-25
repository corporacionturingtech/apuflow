import { like } from 'drizzle-orm';
import { crearBd } from './conexion';
import { apu, insumo, lineaApu, oferta } from './esquema';
import { urlBd } from './url';

// APU ficticio de un solo material de $ 10 (CU 10,00) para el e2e de F1-04b. Propio (RUB-E2E-*):
// ni apu.spec ni los e2e de listas lo tocan. Borra antes las ofertas OFE-RUB* que lo usan.
export async function sembrarRubrosE2e(db: ReturnType<typeof crearBd>['db']) {
  await db.delete(oferta).where(like(oferta.nombre, 'OFE-RUB%'));
  await db.delete(apu).where(like(apu.codigo, 'RUB-E2E%'));
  await db.delete(insumo).where(like(insumo.codigo, 'RUB-E2E%'));
  const [m] = await db
    .insert(insumo)
    .values({
      tipo: 'MA',
      codigo: 'RUB-E2E-MA',
      descripcion: 'Material de rubro ficticio',
      unidad: 'u',
      pu: '10',
    })
    .returning();
  const [a] = await db
    .insert(apu)
    .values({
      codigo: 'RUB-E2E',
      descripcion: 'Rubro ficticio para añadir',
      unidad: 'u',
      disciplina: 'Eléctrico',
    })
    .returning();
  await db.insert(lineaApu).values({ apuId: a!.id, insumoId: m!.id, cantidad: '1' });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { db, pool } = crearBd(urlBd());
  await sembrarRubrosE2e(db);
  console.log('Semilla de rubros E2E lista');
  await pool.end();
}
