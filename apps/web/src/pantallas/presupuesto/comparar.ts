import { calcularDetalle } from 'motor';
import type { OfertaDetalle } from 'tipos';

export type EstadoFila = 'igual' | 'cambio' | 'nuevo' | 'quitado';

export interface FilaComparada {
  clave: string;
  codigo: string;
  descripcion: string;
  antes: number | null;
  despues: number | null;
  estado: EstadoFila;
}

export interface CapituloComparado {
  id: string;
  nombre: string;
  antes: number;
  despues: number;
  filas: FilaComparada[];
}

export interface Comparacion {
  capitulos: CapituloComparado[];
  subtotal: { antes: number; despues: number };
  total: { antes: number; despues: number };
  cambios: number;
}

// Total ofertado por rubro (id del rubro) con el motor; la web no multiplica nada por su cuenta.
function porRubro(d: OfertaDetalle) {
  const c = calcularDetalle(d);
  const apus = new Map(d.apus.map((a) => [a.id, a]));
  const filas = new Map(
    d.rubros.map((r, i) => [
      r.id,
      {
        capituloId: r.capituloId,
        codigo: r.codigo,
        descripcion: apus.get(r.apuId)?.descripcion ?? '',
        valor: c.rubros[i]!.totalOfertado.toNumber(),
      },
    ]),
  );
  return { c, filas };
}

/** Compara una versión guardada («antes») con la oferta tal como está hoy («después»). */
export function compararOfertas(antes: OfertaDetalle, despues: OfertaDetalle): Comparacion {
  const a = porRubro(antes);
  const d = porRubro(despues);
  const nombres = new Map([...antes.capitulos, ...despues.capitulos].map((c) => [c.id, c.nombre]));
  const ordenCapitulos = [...new Set([...despues.capitulos, ...antes.capitulos].map((c) => c.id))];
  let cambios = 0;

  const capitulos = ordenCapitulos.map((id) => {
    const claves = [
      ...[...d.filas].filter(([, f]) => f.capituloId === id).map(([k]) => k),
      ...[...a.filas].filter(([k, f]) => f.capituloId === id && !d.filas.has(k)).map(([k]) => k),
    ];
    const filas = claves.map((clave): FilaComparada => {
      const x = a.filas.get(clave);
      const y = d.filas.get(clave);
      const f = (y ?? x)!;
      const estado: EstadoFila = !x
        ? 'nuevo'
        : !y
          ? 'quitado'
          : x.valor === y.valor
            ? 'igual'
            : 'cambio';
      if (estado !== 'igual') cambios++;
      return {
        clave,
        codigo: f.codigo,
        descripcion: f.descripcion,
        antes: x?.valor ?? null,
        despues: y?.valor ?? null,
        estado,
      };
    });
    return {
      id,
      nombre: nombres.get(id) ?? '',
      antes: a.c.capitulos[id]?.totalOfertado.toNumber() ?? 0,
      despues: d.c.capitulos[id]?.totalOfertado.toNumber() ?? 0,
      filas,
    };
  });

  return {
    capitulos,
    subtotal: { antes: a.c.totales.subtotal.toNumber(), despues: d.c.totales.subtotal.toNumber() },
    total: { antes: a.c.totales.total.toNumber(), despues: d.c.totales.total.toNumber() },
    cambios,
  };
}
