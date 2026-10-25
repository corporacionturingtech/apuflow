import { describe, expect, it } from 'vitest';
import type { OfertaDetalle } from 'tipos';
import { compararOfertas } from './comparar';

const base = (): OfertaDetalle => ({
  id: 'o',
  nombre: 'O',
  cliente: null,
  tipo: 'privado',
  estado: 'borrador',
  version: 1,
  iva: '15',
  factor: '1',
  costoObjetivo: null,
  indirectos: [],
  capitulos: [{ id: 'c1', nombre: 'Bahía', disciplina: null, version: 1 }],
  rubros: [
    {
      id: 'r1',
      capituloId: 'c1',
      apuId: 'a1',
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
      id: 'a1',
      codigo: 'A1',
      descripcion: 'Montaje',
      unidad: 'u',
      disciplina: null,
      rendimiento: '1',
      herramientaMenor: '0',
      lineas: [{ insumoId: 'm1', tipo: 'MA', pu: '2', cantidad: '1' }],
    },
  ],
});

describe('compararOfertas', () => {
  it('rubro cambiado: diferencia por rubro, capítulo y total', () => {
    const hoy = base();
    hoy.rubros[0]!.cantidad = '15';
    const c = compararOfertas(base(), hoy);
    expect(c.capitulos[0]!.filas[0]).toMatchObject({ estado: 'cambio', antes: 20, despues: 30 });
    expect(c.capitulos[0]).toMatchObject({ antes: 20, despues: 30 });
    expect(c.total).toEqual({ antes: 23, despues: 34.5 });
    expect(c.cambios).toBe(1);
  });
  it('rubro nuevo y rubro quitado', () => {
    const hoy = base();
    hoy.rubros = [{ ...hoy.rubros[0]!, id: 'r2', codigo: 'C02' }];
    const c = compararOfertas(base(), hoy);
    const e = c.capitulos[0]!.filas.map((f) => f.estado).sort();
    expect(e).toEqual(['nuevo', 'quitado']);
    expect(c.cambios).toBe(2);
  });
  it('sin cambios', () => {
    const c = compararOfertas(base(), base());
    expect(c.cambios).toBe(0);
    expect(c.total.antes).toBe(c.total.despues);
  });
});
