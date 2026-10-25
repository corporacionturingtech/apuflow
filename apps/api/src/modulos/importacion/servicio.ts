import { leerLibro, type LibroLeido, type Problema } from 'excel';
import type { RevisionImportacion } from 'tipos';
import type { Bd } from '../../db/conexion';
import * as repo from './repo';

export class LibroConProblemas extends Error {}

const PREFIJO = { MA: 'MAT', EQ: 'EQ', MO: 'MO', TR: 'TRA' } as const;
const clave = (tipo: string, descripcion: string) =>
  tipo +
  ':' +
  descripcion
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Lo que el libro trae frente a lo que APUflow ya tiene (sin escribir nada). */
async function comparar(db: Bd, leido: LibroLeido) {
  const [existentes, config, apus] = await Promise.all([
    repo.insumosActivos(db),
    repo.configuracion(db),
    repo.apusExistentes(db),
  ]);
  const porClave = new Map(existentes.map((i) => [clave(i.tipo, i.descripcion), i]));
  const extra: Problema[] = [];
  for (const i of leido.libro.insumos) {
    const e = porClave.get(clave(i.tipo, i.descripcion));
    if (e && Number(e.pu) !== Number(i.pu))
      extra.push({
        hoja: 'Listas',
        fila: 0,
        mensaje: `«${i.descripcion}» ya existe en APUflow con otro precio (${e.pu}, el libro trae ${i.pu}). Se conserva el de APUflow.`,
        bloqueante: false,
      });
  }
  const codigos = new Set(apus.map((a) => a.codigo));
  for (const a of leido.libro.apus)
    if (codigos.has(a.codigo))
      extra.push({
        hoja: 'APU ' + a.codigo,
        fila: 0,
        mensaje: `Ya hay un APU con el código ${a.codigo}; se creará otro con el del libro.`,
        bloqueante: false,
      });
  const l = leido.libro;
  for (const [nombre, libro, empresa] of [
    ['el factor de materiales', l.factor, config.factorMateriales],
    ['el IVA', l.iva, config.iva],
    ['la herramienta menor', l.herramientaMenor, config.pctHerramientaMenor],
  ] as const)
    if (Number(libro) !== Number(empresa))
      extra.push({
        hoja: 'Configuración',
        fila: 0,
        mensaje: `${nombre[0]!.toUpperCase() + nombre.slice(1)} del libro (${libro}) difiere del de su empresa (${empresa}); los totales pueden no cuadrar.`,
        bloqueante: false,
      });
  return { porClave, extra };
}

export async function revisar(
  db: Bd,
  buffer: Uint8Array,
  archivo: string,
): Promise<RevisionImportacion> {
  const leido = await leerLibro(buffer);
  const { porClave, extra } = await comparar(db, leido);
  const problemas = [...leido.problemas, ...extra];
  return {
    archivo,
    proyecto: leido.libro.datos.proyecto || archivo.replace(/\.xlsx$/i, ''),
    resumen: {
      ...leido.resumen,
      insumosNuevos: leido.libro.insumos.filter((i) => !porClave.has(clave(i.tipo, i.descripcion)))
        .length,
    },
    problemas,
    puedeConfirmar: !problemas.some((p) => p.bloqueante) && leido.resumen.rubros > 0,
  };
}

export async function confirmar(db: Bd, usuarioId: string, buffer: Uint8Array, archivo: string) {
  const leido = await leerLibro(buffer);
  if (leido.problemas.some((p) => p.bloqueante) || !leido.libro.rubros.length)
    throw new LibroConProblemas();
  const l = leido.libro;

  return db.transaction(async (tx) => {
    const bitacora: Parameters<typeof repo.registrarBitacora>[1] = [];
    const registrar = (entidad: string, entidadId: string, despues: unknown) =>
      bitacora.push({ usuarioId, entidad, entidadId, campo: null, antes: null, despues });

    // Insumos: se reutilizan los que ya existen (mismo tipo y descripción); los demás se crean.
    const existentes = new Map(
      (await repo.insumosActivos(tx)).map((i) => [clave(i.tipo, i.descripcion), i]),
    );
    const idDe = new Map<string, string>();
    const orden: Record<string, number> = {};
    for (const i of l.insumos) {
      const e = existentes.get(clave(i.tipo, i.descripcion));
      if (e) {
        idDe.set(i.id, e.id);
        continue;
      }
      orden[i.tipo] ??= await repo.ultimoOrden(tx, i.tipo);
      let n = ++orden[i.tipo]!;
      let codigo = `${PREFIJO[i.tipo]}-${String(n).padStart(4, '0')}`;
      while (await repo.codigoEnUso(tx, i.tipo, codigo)) {
        n = ++orden[i.tipo]!;
        codigo = `${PREFIJO[i.tipo]}-${String(n).padStart(4, '0')}`;
      }
      const nuevo = await repo.insertarInsumo(tx, {
        tipo: i.tipo,
        codigo,
        descripcion: i.descripcion,
        unidad: i.unidad,
        pu: i.pu,
        seccion: i.seccion,
        orden: n,
        actualizadoPor: usuarioId,
      });
      idDe.set(i.id, nuevo.id);
      registrar('insumo', nuevo.id, nuevo);
    }

    const apuId = new Map<string, string>();
    for (const a of l.apus) {
      const fila = await repo.insertarApu(tx, {
        codigo: a.codigo,
        descripcion: a.descripcion,
        unidad: a.unidad,
        disciplina: a.disciplina,
        rendimiento: a.rendimiento,
        pctHerramientaMenor: a.herramientaMenor,
        actualizadoPor: usuarioId,
      });
      await repo.insertarLineas(
        tx,
        a.lineas.map((x, orden) => ({
          apuId: fila.id,
          insumoId: idDe.get(x.insumoId)!,
          cantidad: x.cantidad,
          orden,
        })),
      );
      apuId.set(a.codigo, fila.id);
      registrar('apu', fila.id, { ...fila, lineas: a.lineas.length });
    }

    const o = await repo.crearOferta(tx, {
      nombre: l.datos.proyecto || archivo.replace(/\.xlsx$/i, ''),
      cliente: l.datos.cliente || null,
      tipo: l.datos.tipo,
      actualizadoPor: usuarioId,
    });
    registrar('oferta', o.id, { ...o, importadaDe: archivo });
    await repo.insertarIndirectos(
      tx,
      l.indirectos.map((x, orden) => ({
        ofertaId: o.id,
        nombre: x.nombre,
        porcentaje: x.porcentaje,
        esUtilidad: /utilidad/i.test(x.nombre),
        orden,
        actualizadoPor: usuarioId,
      })),
    );
    const capId = new Map<string, string>();
    for (const [orden, c] of l.capitulos.entries()) {
      const fila = await repo.insertarCapitulo(tx, {
        ofertaId: o.id,
        nombre: c.nombre,
        orden,
        actualizadoPor: usuarioId,
      });
      capId.set(c.id, fila.id);
    }
    for (const [orden, r] of l.rubros.entries()) {
      await repo.insertarRubro(tx, {
        ofertaId: o.id,
        capituloId: capId.get(r.capituloId)!,
        apuId: apuId.get(r.apuId)!,
        codigo: r.codigo,
        cantidad: r.cantidad,
        cpc: r.cpc,
        origen: r.origen as 'P' | 'ND' | 'I' | null,
        vae: r.vae,
        orden,
        actualizadoPor: usuarioId,
      });
    }
    registrar('oferta', o.id, { rubros: l.rubros.length, capitulos: l.capitulos.length });
    await repo.registrarBitacora(tx, bitacora);
    return o.id;
  });
}
