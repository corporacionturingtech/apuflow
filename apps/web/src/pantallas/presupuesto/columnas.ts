import type { Columna } from '../../componentes/TablaEditable';
import { money, pct, qty } from '../../lib/formato';

export interface FilaRubro {
  id: string;
  version: number;
  numero: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: string;
  cpc: string;
  origen: string;
  vae: string;
  cu: number;
  cuTotal: number;
  pu: number;
  total: number;
  peso: number;
}

export function columnasPresupuesto(publico: boolean, ofertado: boolean): Columna<FilaRubro>[] {
  return [
    { id: 'numero', titulo: 'N.º', ancho: 56, ver: (f) => f.numero },
    {
      id: 'codigo',
      titulo: 'Código',
      ancho: 80,
      ver: (f) => f.codigo,
      editar: (f) => f.codigo,
    },
    {
      id: 'descripcion',
      titulo: 'Descripción del rubro',
      ancho: 220,
      flexible: true,
      ver: (f) => f.descripcion,
    },
    ...(publico
      ? [
          {
            id: 'cpc',
            titulo: 'CPC',
            ancho: 90,
            ver: (f: FilaRubro) => f.cpc,
            editar: (f: FilaRubro) => f.cpc,
          },
          {
            id: 'origen',
            titulo: 'Origen',
            ancho: 60,
            ver: (f: FilaRubro) => f.origen,
            editar: (f: FilaRubro) => f.origen,
          },
          {
            id: 'vae',
            titulo: 'VAE %',
            ancho: 70,
            alinear: 'der' as const,
            ver: (f: FilaRubro) => (f.vae ? qty(Number(f.vae)) : ''),
            editar: (f: FilaRubro) => (f.vae ? qty(Number(f.vae)).replace(/\./g, '') : ''),
          },
        ]
      : []),
    { id: 'unidad', titulo: 'Unidad', ancho: 60, ver: (f) => f.unidad },
    {
      id: 'cantidad',
      titulo: 'Cantidad',
      ancho: 96,
      alinear: 'der',
      ver: (f) => qty(Number(f.cantidad)),
      editar: (f) => qty(Number(f.cantidad)).replace(/\./g, ''),
    },
    ofertado
      ? { id: 'pu', titulo: 'P.U. ofertado', ancho: 120, alinear: 'der', ver: (f) => money(f.pu) }
      : {
          id: 'cu',
          titulo: 'CU (costo directo)',
          ancho: 120,
          alinear: 'der',
          ver: (f) => money(f.cu),
        },
    ofertado
      ? {
          id: 'total',
          titulo: 'Total ofertado',
          ancho: 130,
          alinear: 'der',
          ver: (f) => money(f.total),
        }
      : {
          id: 'cuTotal',
          titulo: 'CU total',
          ancho: 130,
          alinear: 'der',
          ver: (f) => money(f.cuTotal),
        },
    { id: 'peso', titulo: 'Peso', ancho: 64, alinear: 'der', ver: (f) => pct(f.peso) },
  ];
}
