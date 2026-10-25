import { like } from 'drizzle-orm';
import { crearBd } from './conexion';
import { apu, capitulo, indirecto, insumo, lineaApu, oferta, rubro } from './esquema';
import { urlBd } from './url';

// Oferta ficticia para el e2e de F2-04: dos rubros de CU 10,00 con 10 % de utilidad → subtotal
// $ 22,00. Prefijo propio (IND-E2E) para no pisar las semillas de otros e2e en paralelo.
export const NOMBRE_OFERTA_IND = 'IND-E2E Oferta de indirectos';

export async function sembrarIndirectosE2e(db: ReturnType<typeof crearBd>['db']) {
  await db.delete(oferta).where(like(oferta.nombre, 'IND-E2E%'));
  await db.delete(apu).where(like(apu.codigo, 'IND-E2E%'));
  await db.delete(insumo).where(like(insumo.codigo, 'IND-E2E%'));
  const [m] = await db
    .insert(insumo)
    .values({
      tipo: 'MA',
      codigo: 'IND-E2E-MA',
      descripcion: 'Material ficticio',
      unidad: 'u',
      pu: '10',
    })
    .returning();
  const [a] = await db
    .insert(apu)
    .values({ codigo: 'IND-E2E', descripcion: 'Rubro ficticio', unidad: 'u' })
    .returning();
  await db.insert(lineaApu).values({ apuId: a!.id, insumoId: m!.id, cantidad: '1' });
  const [o] = await db
    .insert(oferta)
    .values({ nombre: NOMBRE_OFERTA_IND, cliente: 'Cliente ficticio', tipo: 'privado' })
    .returning();
  const [cap] = await db
    .insert(capitulo)
    .values({ ofertaId: o!.id, nombre: 'Capítulo ficticio', orden: 1 })
    .returning();
  await db.insert(rubro).values(
    [1, 2].map((i) => ({
      ofertaId: o!.id,
      capituloId: cap!.id,
      apuId: a!.id,
      codigo: `R${i}`,
      cantidad: '1',
      orden: i,
    })),
  );
  await db.insert(indirecto).values([
    { ofertaId: o!.id, nombre: 'Gastos generales', porcentaje: '0', orden: 1 },
    { ofertaId: o!.id, nombre: 'Utilidad', porcentaje: '10', esUtilidad: true, orden: 2 },
  ]);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { db, pool } = crearBd(urlBd());
  await sembrarIndirectosE2e(db);
  console.log('Oferta de indirectos E2E sembrada');
  await pool.end();
}
