import { and, asc, eq, gte, inArray, lt, max, notInArray, sql } from 'drizzle-orm';
import type { Bd } from '../../db/conexion';
import { avisoEnviado, bitacora, eventoUso, usuario } from '../../db/esquema';
import { configuracion } from '../insumos/repo';
import { diaEc, horaDelDiaEc, horaEc, inicioDiaEc } from './fechas';
import { textoResumen, type UsoDelDia } from './resumen';
import { enviarTelegram, type ConfigAvisos } from './telegram';

const nombreEmpresa = async (db: Bd) => (await configuracion(db)).nombre;

const rangoDia = (ahora: Date) => {
  const desde = inicioDiaEc(diaEc(ahora));
  return { desde, hasta: new Date(desde.getTime() + 86_400_000) };
};

/**
 * Guarda el ingreso y, si es el primero del día de ese usuario, devuelve el texto del aviso.
 * No envía: quien llama lo manda sin esperar, para no demorar el login.
 */
export async function registrarIngreso(
  db: Bd,
  u: { id: string; nombreUsuario: string; nombre: string },
  cfg: ConfigAvisos | null,
  ahora = new Date(),
): Promise<string | null> {
  await db.insert(eventoUso).values({ usuarioId: u.id, tipo: 'ingreso', fecha: ahora });
  if (!cfg || cfg.ignorar.includes(u.nombreUsuario)) return null;
  const { desde, hasta } = rangoDia(ahora);
  const [fila] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(eventoUso)
    .where(
      and(
        eq(eventoUso.usuarioId, u.id),
        eq(eventoUso.tipo, 'ingreso'),
        gte(eventoUso.fecha, desde),
        lt(eventoUso.fecha, hasta),
      ),
    );
  if ((fila?.n ?? 0) > 1) return null;
  return `🟢 ${await nombreEmpresa(db)} · ${u.nombre} entró a Turing APU (${horaEc(ahora)}).`;
}

export const registrarExportacion = (db: Bd, usuarioId: string, ahora = new Date()) =>
  db.insert(eventoUso).values({ usuarioId, tipo: 'exportacion', fecha: ahora });

/** Uso del día de cada usuario activo, sin los que se ignoran. */
export async function usoDelDia(db: Bd, ahora: Date, ignorar: string[]): Promise<UsoDelDia[]> {
  const { desde, hasta } = rangoDia(ahora);
  const usuarios = await db
    .select({ id: usuario.id, nombre: usuario.nombre })
    .from(usuario)
    .where(
      and(
        eq(usuario.activo, true),
        ignorar.length ? notInArray(usuario.nombreUsuario, ignorar) : undefined,
      ),
    )
    .orderBy(asc(usuario.nombre));
  if (!usuarios.length) return [];
  const ids = usuarios.map((u) => u.id);

  const eventos = await db
    .select({ usuarioId: eventoUso.usuarioId, tipo: eventoUso.tipo, fecha: eventoUso.fecha })
    .from(eventoUso)
    .where(
      and(
        inArray(eventoUso.usuarioId, ids),
        gte(eventoUso.fecha, desde),
        lt(eventoUso.fecha, hasta),
      ),
    )
    .orderBy(asc(eventoUso.fecha));
  const anteriores = await db
    .select({ usuarioId: eventoUso.usuarioId, ultimo: max(eventoUso.fecha) })
    .from(eventoUso)
    .where(
      and(
        inArray(eventoUso.usuarioId, ids),
        eq(eventoUso.tipo, 'ingreso'),
        lt(eventoUso.fecha, desde),
      ),
    )
    .groupBy(eventoUso.usuarioId);
  const cambios = await db
    .select({
      usuarioId: bitacora.usuarioId,
      entidad: bitacora.entidad,
      entidadId: bitacora.entidadId,
      campo: bitacora.campo,
      nuevo: sql<boolean>`${bitacora.antes} is null`,
      nombre: sql<string | null>`${bitacora.despues}->>'nombre'`,
      bloqueId: sql<string | null>`${bitacora.despues}->>'bloqueId'`,
    })
    .from(bitacora)
    .where(
      and(inArray(bitacora.usuarioId, ids), gte(bitacora.fecha, desde), lt(bitacora.fecha, hasta)),
    )
    .orderBy(asc(bitacora.fecha));

  return usuarios.map((u) => {
    const ev = eventos.filter((e) => e.usuarioId === u.id);
    const mios = cambios.filter((c) => c.usuarioId === u.id);
    const precios = mios.filter((c) => c.entidad === 'insumo' && c.campo === 'pu');
    const ofertas = mios.filter((c) => c.entidad === 'oferta' && c.nuevo && !c.campo);
    const bloques = mios.filter((c) => c.entidad === 'capitulo' && c.nuevo && c.bloqueId);
    return {
      nombre: u.nombre,
      ingresos: ev.filter((e) => e.tipo === 'ingreso').map((e) => e.fecha),
      ultimoIngreso: anteriores.find((a) => a.usuarioId === u.id)?.ultimo ?? null,
      exportaciones: ev.filter((e) => e.tipo === 'exportacion').length,
      precios: new Set(precios.map((c) => c.entidadId)).size,
      ofertasNuevas: ofertas.map((c) => c.nombre ?? 'sin nombre'),
      bloques: bloques.length,
      otrosCambios: mios.length - precios.length - ofertas.length - bloques.length,
    };
  });
}

/**
 * Envía el resumen del día una sola vez, desde la hora configurada. Se llama cada pocos minutos:
 * el día se reclama en `aviso_enviado`, así un reinicio no lo repite. Si Telegram falla, se suelta
 * el reclamo para reintentar en la siguiente vuelta.
 */
export async function resumenSiToca(
  db: Bd,
  cfg: ConfigAvisos,
  ahora = new Date(),
  enviar: (texto: string) => Promise<boolean> = (t) => enviarTelegram(cfg, t),
): Promise<boolean> {
  if (horaDelDiaEc(ahora) < cfg.hora) return false;
  const dia = diaEc(ahora);
  const reclamo = await db
    .insert(avisoEnviado)
    .values({ dia, tipo: 'resumen' })
    .onConflictDoNothing()
    .returning();
  if (!reclamo.length) return false;
  const texto = textoResumen(
    await nombreEmpresa(db),
    ahora,
    await usoDelDia(db, ahora, cfg.ignorar),
  );
  if (await enviar(texto)) return true;
  await db
    .delete(avisoEnviado)
    .where(and(eq(avisoEnviado.dia, dia), eq(avisoEnviado.tipo, 'resumen')));
  return false;
}

/** Reloj del resumen diario: revisa cada 5 minutos. Solo en el proceso real, no en pruebas. */
export function iniciarAvisos(db: Bd, cfg: ConfigAvisos) {
  const vuelta = () =>
    resumenSiToca(db, cfg).catch((e) =>
      console.warn('[avisos] Falló el resumen diario:', (e as Error).message),
    );
  setInterval(vuelta, 5 * 60_000).unref();
  console.log(`[avisos] Avisos de uso por Telegram activos (resumen desde las ${cfg.hora}:00).`);
}
