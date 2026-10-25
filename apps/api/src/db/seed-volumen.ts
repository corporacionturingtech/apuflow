import { like } from 'drizzle-orm';
import { crearBd } from './conexion';
import { insumo } from './esquema';
import { urlBd } from './url';

// Materiales ficticios (código VOL-####) para probar la tabla con miles de filas. Idempotente.
const secciones = ['Civil', 'Eléctrico', 'Mecánico', 'Varios'];

// Pocas filas de Equipos, Mano de obra y Transporte (códigos LST-*) para los e2e de F1-02.
const otras = [
  { tipo: 'EQ', codigo: 'LST-EQ-01', descripcion: 'Grúa ficticia 20 t', unidad: 'hora', pu: '45' },
  {
    tipo: 'MO',
    codigo: 'LST-MO-01',
    descripcion: 'Electricista ficticio',
    unidad: 'hora',
    pu: '4.2',
  },
  { tipo: 'TR', codigo: 'LST-TR-01', descripcion: 'Flete ficticio', unidad: 'viaje', pu: '120' },
] as const;

async function sembrarOtrasListas(db: ReturnType<typeof crearBd>['db']) {
  await db.delete(insumo).where(like(insumo.codigo, 'LST-%'));
  await db.insert(insumo).values(otras.map((o, i) => ({ ...o, orden: i + 1 })));
}

export async function sembrarVolumen(db: ReturnType<typeof crearBd>['db'], total = 2000) {
  await sembrarOtrasListas(db);
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
