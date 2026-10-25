import { expect, it } from 'vitest';
import type { OfertaDetalle } from 'tipos';
import { calcularPresupuesto, costoDirectoBloque } from './calculo';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// Ayudante 3 $/h, R=2, ×1 → MO 6,00 + HM 5 % 0,30 → CU 6,30; indirectos 10 % → P.U. 6,93.
const detalle: OfertaDetalle = {
  id: uuid(1),
  nombre: 'Oferta ficticia',
  cliente: null,
  tipo: 'privado',
  estado: 'borrador',
  version: 1,
  iva: '15',
  factor: '1',
  costoObjetivo: null,
  indirectos: [{ id: uuid(2), nombre: 'Indirectos', porcentaje: '10' }],
  capitulos: [{ id: uuid(3), nombre: 'Bahía', disciplina: null, version: 1 }],
  rubros: [
    {
      id: uuid(4),
      capituloId: uuid(3),
      apuId: uuid(5),
      codigo: 'C01',
      cantidad: '10',
      cpc: null,
      origen: null,
      vae: null,
      version: 1,
    },
  ],
  apus: [
    {
      id: uuid(5),
      codigo: 'A',
      descripcion: 'Montaje',
      unidad: 'u',
      disciplina: null,
      rendimiento: '2',
      herramientaMenor: '5',
      lineas: [{ insumoId: uuid(6), tipo: 'MO', pu: '3', cantidad: '1' }],
    },
  ],
};

it('arma la entrada del motor y calcula totales con IVA', () => {
  const c = calcularPresupuesto(detalle);
  expect(c.rubros[0]!.cu.toFixed(2)).toBe('6.30');
  expect(c.totales.subtotal.toFixed(2)).toBe('69.30');
  expect(c.totales.iva.toFixed(2)).toBe('10.40');
  expect(c.totales.total.toFixed(2)).toBe('79.70');
});

it('cambiar la cantidad cambia el subtotal', () => {
  const c = calcularPresupuesto({
    ...detalle,
    rubros: [{ ...detalle.rubros[0]!, cantidad: '20' }],
  });
  expect(c.totales.subtotal.toFixed(2)).toBe('138.60');
});

it('costo directo de un bloque: cantidades × CU del APU', () => {
  const b = {
    id: uuid(9),
    nombre: 'Bahía',
    disciplina: null,
    version: 1,
    lineas: [{ apuId: uuid(5), cantidad: '10' }],
  };
  expect(costoDirectoBloque({ iva: '15', factor: '1', items: [b], apus: detalle.apus }, b)).toBe(
    63,
  );
});
