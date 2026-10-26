import { expect, test } from 'vitest';
import type { BitacoraFila } from 'tipos';
import { describir } from './historialTexto';

const fila = (f: Partial<BitacoraFila>) =>
  ({
    id: '1',
    fecha: '2026-10-25T10:00:00Z',
    usuario: 'Ana',
    entidad: 'config_empresa',
    entidadId: 'x',
    campo: null,
    antes: null,
    despues: null,
    ...f,
  }) as BitacoraFila;

test('los minutos de ahorro se leen como frase, no como [object Object]', () => {
  const d = describir(
    fila({
      campo: 'parametrosValor',
      antes: { valor: { minutosPorRubro: 3, minutosPorRecalculo: 2 } },
      despues: { valor: { minutosPorRubro: 5, minutosPorRecalculo: 2.5 } },
    }),
  );
  expect(d.que).toBe('cambió los minutos de ahorro de la configuración');
  expect(d.cambio).toBe(
    'por rubro 3 min, por recálculo 2 min → por rubro 5 min, por recálculo 2,5 min',
  );
});

test('un objeto desconocido tampoco sale como [object Object]', () => {
  const d = describir(fila({ campo: 'otro', antes: { valor: { a: 1 } }, despues: { valor: {} } }));
  expect(d.cambio).toBe('a 1 → —');
  expect(d.que).toContain('«otro»');
});

test('Configuración › Empresa guarda el valor bajo el nombre del campo', () => {
  const d = describir(fila({ campo: 'iva', antes: { iva: '15' }, despues: { iva: '18' } }));
  expect(d.que).toBe('cambió el IVA de la configuración');
  expect(d.cambio).toBe('15 → 18');
});

test('valores simples siguen igual', () => {
  const d = describir(
    fila({ entidad: 'insumo', campo: 'pu', antes: { valor: '9.6' }, despues: { valor: '10.4' } }),
  );
  expect(d.cambio).toBe('9,6 → 10,4');
  expect(describir(fila({ entidad: 'oferta', despues: { nombre: 'OFE-1' } })).que).toBe(
    'creó la oferta «OFE-1»',
  );
});
