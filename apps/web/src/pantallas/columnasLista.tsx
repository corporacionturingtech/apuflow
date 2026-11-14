import { precioMaterial } from 'motor';
import type { Insumo } from 'tipos';
import type { Columna, FilaTabla } from '../componentes/TablaEditable';
import { normalizar } from '../lib/disciplina';
import { fmt, money, n2 } from '../lib/formato';

/** Variación contra el precio referencial (el anterior): % con signo, o null si no hay anterior. */
function variacion(i: Insumo) {
  if (i.precioAnterior === null) return null;
  const antes = Number(i.precioAnterior);
  const d = Number(i.pu) - antes;
  const flecha = d > 0 ? '↑' : d < 0 ? '↓' : '';
  const pct =
    antes === 0
      ? ''
      : `${d > 0 ? '+' : d < 0 ? '−' : ''}${fmt(Math.abs((d / antes) * 100), 1, 1)} %`;
  return { antes: money(antes), flecha, pct, d };
}

const textoVariacion = (i: Insumo) => {
  const v = variacion(i);
  return v ? `${v.antes} ${v.flecha} ${v.pct}`.replace(/\s+/g, ' ').trim() : '';
};

function Variacion({ i }: { i: Insumo }) {
  const v = variacion(i);
  if (!v) return <span className="text-slate-300">—</span>;
  // Para quien cotiza un costo que sube es la mala noticia: ámbar; uno que baja, verde.
  const tono = v.d > 0 ? 'text-amber-700' : v.d < 0 ? 'text-emerald-700' : 'text-slate-400';
  return (
    <span className="flex items-baseline justify-end gap-2">
      <span className="text-slate-500">{v.antes}</span>
      <span className={`w-16 text-right text-xs font-medium ${tono}`}>
        {v.flecha} {v.pct || (v.d === 0 ? 'igual' : '')}
      </span>
    </span>
  );
}

/** «Precio referencial» solo aparece si algún insumo tiene precio anterior: una columna de «—» es ruido. */
export function columnasLista(
  factor: number,
  conFactor: boolean,
  conReferencial = true,
): Columna<Insumo>[] {
  return [
    { id: 'codigo', titulo: 'Código', ancho: 110, ver: (i) => i.codigo, editar: (i) => i.codigo },
    {
      id: 'descripcion',
      titulo: 'Descripción',
      ancho: 280,
      flexible: true,
      ver: (i) => i.descripcion,
      editar: (i) => i.descripcion,
    },
    { id: 'unidad', titulo: 'Unidad', ancho: 80, ver: (i) => i.unidad, editar: (i) => i.unidad },
    {
      id: 'pu',
      titulo: 'P.U.',
      ancho: 120,
      alinear: 'der',
      ver: (i) => money(Number(i.pu)),
      editar: (i) => n2(Number(i.pu)).replace(/\./g, ''),
    },
    ...(conFactor
      ? [
          {
            id: 'puFactor',
            titulo: `P.U. × factor (${fmt(factor, 2, 4)})`,
            ancho: 160,
            alinear: 'der' as const,
            ver: (i: Insumo) => money(precioMaterial(i.pu, factor).toNumber()),
          },
        ]
      : []),
    ...(conReferencial
      ? [
          {
            id: 'anterior',
            titulo: 'Precio referencial',
            ancho: 190,
            alinear: 'der' as const,
            ver: textoVariacion,
            pintar: (i: Insumo) => <Variacion i={i} />,
          },
        ]
      : []),
  ];
}

/** Filtra sin tildes por código, descripción o sección y agrupa por sección, como en su libro. */
export function filasLista(items: Insumo[], busqueda: string) {
  const t = normalizar(busqueda.trim());
  const visibles = t
    ? items.filter((i) => normalizar(`${i.codigo} ${i.descripcion} ${i.seccion ?? ''}`).includes(t))
    : items;
  const filas: FilaTabla<Insumo>[] = [];
  let seccion: string | null | undefined;
  for (const i of visibles) {
    if (i.seccion !== seccion && i.seccion)
      filas.push({ clave: `s-${i.seccion}`, seccion: i.seccion });
    seccion = i.seccion;
    filas.push({ clave: i.id, dato: i });
  }
  return { filas, cuantos: visibles.length };
}
