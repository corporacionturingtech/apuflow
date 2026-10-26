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
  prefijo = 'OFE-E2E',
) {
  await db.delete(oferta).where(like(oferta.nombre, `${prefijo}%`));
  await db.delete(apu).where(like(apu.codigo, `${prefijo}%`));
  await db.delete(insumo).where(like(insumo.codigo, `${prefijo}%`));
  const [m] = await db
    .insert(insumo)
    .values({
      tipo: 'MA',
      codigo: `${prefijo}-MA`,
      descripcion: 'Material de oferta ficticio',
      unidad: 'u',
      pu: '10',
    })
    .returning();
  const [a] = await db
    .insert(apu)
    .values({
      codigo: prefijo,
      descripcion: 'Rubro ficticio de volumen',
      unidad: 'u',
      disciplina: 'Eléctrico',
    })
    .returning();
  await db.insert(lineaApu).values({ apuId: a!.id, insumoId: m!.id, cantidad: '1' });
  const [o] = await db
    .insert(oferta)
    .values({
      nombre:
        prefijo === 'OFE-E2E'
          ? NOMBRE_OFERTA_E2E
          : `${prefijo} Oferta de ${capitulos * porCapitulo} rubros`,
      cliente: 'Cliente ficticio',
      tipo: 'publico',
    })
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
  // `pnpm db:seed-volumen-oferta` pasa `VOL`: 10 × 500 = 5.000 rubros para e2e/volumen.spec.ts
  const vol = process.argv[2] === 'VOL';
  const n = vol ? await sembrarOfertaE2e(db, 10, 500, 'OFE-VOL') : await sembrarOfertaE2e(db);
  console.log(`Oferta ${vol ? 'de volumen' : 'E2E'} sembrada: ${n} rubros`);
  await pool.end();
}
