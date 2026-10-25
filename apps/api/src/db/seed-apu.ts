import { eq, like } from 'drizzle-orm';
import { crearBd } from './conexion';
import { apu, insumo, lineaApu } from './esquema';
import { urlBd } from './url';

// APU ficticio para el e2e de F1-03 (R=2, ayudantes ×3). Usa insumos propios (códigos APU-E2E-*)
// para que editar las listas LST-* en otros e2e no cambie su CU. Recrea todo: idempotente.
const insumos = [
  {
    tipo: 'EQ',
    codigo: 'APU-E2E-EQ',
    descripcion: 'Grúa de APU ficticia',
    unidad: 'hora',
    pu: '45',
    cant: '1',
  },
  {
    tipo: 'MO',
    codigo: 'APU-E2E-M1',
    descripcion: 'Electricista de APU ficticio',
    unidad: 'hora',
    pu: '4.2',
    cant: '1',
  },
  {
    tipo: 'MO',
    codigo: 'APU-E2E-M2',
    descripcion: 'Ayudante ficticio',
    unidad: 'hora',
    pu: '3.1',
    cant: '3',
  },
  {
    tipo: 'TR',
    codigo: 'APU-E2E-TR',
    descripcion: 'Flete de APU ficticio',
    unidad: 'viaje',
    pu: '120',
    cant: '1',
  },
] as const;

export async function sembrarApuE2e(db: ReturnType<typeof crearBd>['db']) {
  await db.delete(apu).where(eq(apu.codigo, 'APU-E2E'));
  await db.delete(insumo).where(like(insumo.codigo, 'APU-E2E-%'));
  const filas = await db
    .insert(insumo)
    .values(
      insumos.map((i, orden) => ({
        tipo: i.tipo,
        codigo: i.codigo,
        descripcion: i.descripcion,
        unidad: i.unidad,
        pu: i.pu,
        orden,
      })),
    )
    .returning();
  const [a] = await db
    .insert(apu)
    .values({
      codigo: 'APU-E2E',
      descripcion: 'Montaje ficticio de prueba',
      unidad: 'u',
      disciplina: 'Eléctrico',
      rendimiento: '2',
    })
    .returning();
  await db.insert(lineaApu).values(
    filas.map((f, orden) => ({
      apuId: a!.id,
      insumoId: f.id,
      cantidad: insumos.find((i) => i.codigo === f.codigo)!.cant,
      orden,
    })),
  );
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { db, pool } = crearBd(urlBd());
  await sembrarApuE2e(db);
  console.log('APU-E2E sembrado');
  await pool.end();
}
