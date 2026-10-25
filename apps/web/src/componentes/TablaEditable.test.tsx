// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { TablaEditable, type Columna, type FilaTabla } from './TablaEditable';
import { precioATexto } from '../pantallas/ListaPrecios';

afterEach(cleanup);

// jsdom no calcula layout: sin esto el virtualizador cree que el contenedor mide 0.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 1000 });
});

type F = { id: string; nombre: string; pu: number };
const columnas: Columna<F>[] = [
  { id: 'nombre', titulo: 'Nombre', ancho: 200, ver: (f) => f.nombre },
  { id: 'pu', titulo: 'P.U.', ancho: 100, ver: (f) => String(f.pu), editar: (f) => String(f.pu) },
];
const filas: FilaTabla<F>[] = [
  { clave: 's', seccion: 'Cables' },
  { clave: 'a', dato: { id: 'a', nombre: 'Cable A', pu: 9.6 } },
  { clave: 'b', dato: { id: 'b', nombre: 'Cable B', pu: 3 } },
];

function montar(soloLectura = false) {
  const alGuardar = vi.fn();
  render(
    <TablaEditable
      nombre="Prueba"
      columnas={columnas}
      filas={filas}
      editadas={new Set(['a'])}
      soloLectura={soloLectura}
      alGuardar={alGuardar}
    />,
  );
  return { alGuardar, grid: screen.getByRole('grid') };
}

it('flechas, F2 y Enter guardan con el texto escrito', () => {
  const { alGuardar, grid } = montar();
  fireEvent.keyDown(grid, { key: 'ArrowRight' });
  fireEvent.keyDown(grid, { key: 'F2' });
  const editor = screen.getByLabelText('Editar celda');
  fireEvent.change(editor, { target: { value: '10,40' } });
  fireEvent.keyDown(editor, { key: 'Enter' });
  expect(alGuardar).toHaveBeenCalledWith({ id: 'a', nombre: 'Cable A', pu: 9.6 }, 'pu', '10,40');
});

it('escribir directamente abre el editor y Esc cancela', () => {
  const { alGuardar, grid } = montar();
  fireEvent.keyDown(grid, { key: 'ArrowRight' });
  fireEvent.keyDown(grid, { key: '7' });
  expect(screen.getByLabelText<HTMLInputElement>('Editar celda').value).toBe('7');
  fireEvent.keyDown(screen.getByLabelText('Editar celda'), { key: 'Escape' });
  expect(screen.queryByLabelText('Editar celda')).toBeNull();
  expect(alGuardar).not.toHaveBeenCalled();
});

it('solo lectura no abre editor', () => {
  const { grid } = montar(true);
  fireEvent.keyDown(grid, { key: 'ArrowRight' });
  fireEvent.keyDown(grid, { key: 'F2' });
  expect(screen.queryByLabelText('Editar celda')).toBeNull();
});

it('la fila editada se marca en amarillo', () => {
  montar();
  const celda = screen.getAllByRole('gridcell').find((c) => c.textContent === '9.6');
  expect(celda?.className).toContain('bg-yellow-100');
});

it('precioATexto acepta coma y punto y rechaza lo inválido', () => {
  expect(precioATexto('10,40')).toBe('10.4');
  expect(precioATexto('10.40')).toBe('10.4');
  expect(precioATexto('1.313,64')).toBe('1313.64');
  expect(precioATexto('abc')).toBeNull();
  expect(precioATexto('-3')).toBeNull();
});
