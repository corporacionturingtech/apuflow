import { like } from 'drizzle-orm';
import { crearBd } from './conexion';
import { insumo } from './esquema';
import { urlBd } from './url';

// Materiales ficticios (código VOL-####) para probar la tabla con miles de filas. Idempotente.
const secciones = ['Civil', 'Eléctrico', 'Mecánico', 'Varios'];

export async function sembrarVolumen(db: ReturnType<typeof crearBd>['db'], total = 2000) {
  const hay = await db.select({ id: insumo.id }).from(insumo).where(like(insumo.codigo, 'VOL-%'));
  if (hay.length >= total) return 0;
  await db.delete(insumo).where(like(insumo.codigo, 'VOL-%'));
  const filas = Array.from({ length: total }, (_, i) => ({
    tipo: 'MA' as const,
    codigo: `VOL-${String(i + 1).padStart(4, '0')}`,
    descripcion: `Material ficticio ${i + 1}`,
    unidad: 'u',
    pu: ((i % 97) + 1.25).toFixed(2),
    seccion: secciones[Math.floor((i * secciones.length) / total)]!,
    orden: i + 1,
  }));
  for (let i = 0; i < filas.length; i += 500)
    await db.insert(insumo).values(filas.slice(i, i + 500));
  return total;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { db, pool } = crearBd(urlBd());
  console.log(`Materiales de volumen sembrados: ${await sembrarVolumen(db)}`);
  await pool.end();
}
