import { like } from 'drizzle-orm';
import { crearBd } from './conexion';
import { apu, capitulo, insumo, lineaApu, oferta, rubro } from './esquema';
import { urlBd } from './url';

// Oferta ficticia de 1.500 rubros (5 capítulos × 300) para el e2e de F1-04 y la prueba de volumen.
// Todos los rubros usan un APU de un solo material de $ 10 (CU 10,00, sin indirectos): subtotal
// inicial $ 15.000,00. Insumos y APU propios (OFE-E2E-*): no toca los LST-* ni los VOL-*.
export const NOMBRE_OFERTA_E2E = 'OFE-E2E Subestación de volumen';

export async function sembrarOfertaE2e(
  db: ReturnType<typeof crearBd>['db'],
  capitulos = 5,
  porCapitulo = 300,
) {
  await db.delete(oferta).where(like(oferta.nombre, 'OFE-E2E%'));
  await db.delete(apu).where(like(apu.codigo, 'OFE-E2E%'));
  await db.delete(insumo).where(like(insumo.codigo, 'OFE-E2E%'));
  const [m] = await db
    .insert(insumo)
    .values({
      tipo: 'MA',
      codigo: 'OFE-E2E-MA',
      descripcion: 'Material de oferta ficticio',
      unidad: 'u',
      pu: '10',
    })
    .returning();
  const [a] = await db
    .insert(apu)
    .values({
      codigo: 'OFE-E2E',
      descripcion: 'Rubro ficticio de volumen',
      unidad: 'u',
      disciplina: 'Eléctrico',
    })
    .returning();
  await db.insert(lineaApu).values({ apuId: a!.id, insumoId: m!.id, cantidad: '1' });
  const [o] = await db
    .insert(oferta)
    .values({ nombre: NOMBRE_OFERTA_E2E, cliente: 'Cliente ficticio', tipo: 'publico' })
    .returning();
  for (let c = 0; c < capitulos; c++) {
    const [cap] = await db
      .insert(capitulo)
      .values({ ofertaId: o!.id, nombre: `Capítulo ficticio ${c + 1}`, orden: c + 1 })
      .returning();
    await db.insert(rubro).values(
      Array.from({ length: porCapitulo }, (_, i) => ({
        ofertaId: o!.id,
        capituloId: cap!.id,
        apuId: a!.id,
        codigo: `R${c + 1}-${String(i + 1).padStart(3, '0')}`,
        cantidad: '1',
        orden: i + 1,
      })),
    );
  }
  return capitulos * porCapitulo;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { db, pool } = crearBd(urlBd());
  console.log(`Oferta E2E sembrada: ${await sembrarOfertaE2e(db)} rubros`);
  await pool.end();
}
