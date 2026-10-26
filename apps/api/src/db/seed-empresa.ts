import { like } from 'drizzle-orm';
import { crearBd } from './conexion';
import { apu, capitulo, insumo, lineaApu, oferta, rubro } from './esquema';
import { urlBd } from './url';

// Oferta ficticia para el e2e de F5-05: un rubro de CU 10,00, sin indirectos y sin IVA propio
// (usa el de la empresa) → con 15 % el total es $ 11,50; con 18 %, $ 11,80. Prefijo EMP-E2E.
export const NOMBRE_OFERTA_EMP = 'EMP-E2E Oferta de IVA';

export async function sembrarEmpresaE2e(db: ReturnType<typeof crearBd>['db']) {
  await db.delete(oferta).where(like(oferta.nombre, 'EMP-E2E%'));
  await db.delete(apu).where(like(apu.codigo, 'EMP-E2E%'));
  await db.delete(insumo).where(like(insumo.codigo, 'EMP-E2E%'));
  const [m] = await db
    .insert(insumo)
    .values({
      tipo: 'MA',
      codigo: 'EMP-E2E-MA',
      descripcion: 'Material ficticio',
      unidad: 'u',
      pu: '10',
    })
    .returning();
  const [a] = await db
    .insert(apu)
    .values({ codigo: 'EMP-E2E', descripcion: 'Rubro ficticio', unidad: 'u' })
    .returning();
  await db.insert(lineaApu).values({ apuId: a!.id, insumoId: m!.id, cantidad: '1' });
  const [o] = await db
    .insert(oferta)
    .values({ nombre: NOMBRE_OFERTA_EMP, cliente: 'Cliente ficticio', tipo: 'privado' })
    .returning();
  const [cap] = await db
    .insert(capitulo)
    .values({ ofertaId: o!.id, nombre: 'Capítulo ficticio', orden: 1 })
    .returning();
  await db
    .insert(rubro)
    .values({
      ofertaId: o!.id,
      capituloId: cap!.id,
      apuId: a!.id,
      codigo: 'R1',
      cantidad: '1',
      orden: 1,
    });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { db, pool } = crearBd(urlBd());
  await sembrarEmpresaE2e(db);
  console.log('Oferta de empresa E2E sembrada');
  await pool.end();
}
