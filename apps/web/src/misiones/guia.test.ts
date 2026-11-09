import { beforeEach, expect, test } from 'vitest';
import { objetivoVisible } from './BarraGuia';
import {
  avisarApi,
  avisarRuta,
  cargarUsuario,
  iniciarMision,
  leerEstado,
  pasoActual,
  siguienteMision,
} from './guia';
import { MISIONES, misionesDe } from './misiones';

let n = 0;
beforeEach(() => cargarUsuario(`u${++n}`));
const objetivo = () => pasoActual(leerEstado())?.objetivo;

test('son siete misiones y cada paso tiene objetivo y texto', () => {
  expect(MISIONES).toHaveLength(7);
  for (const p of MISIONES.flatMap((m) => m.pasos)) expect(p.objetivo && p.texto).toBeTruthy();
});

test('la vista sencilla quita las misiones de pantallas escondidas', () => {
  const sencilla = misionesDe(true);
  expect(sencilla.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4', 'm7']);
  const objetivos = sencilla.flatMap((m) => m.pasos.map((p) => `${p.pantalla} ${p.objetivo}`));
  expect(objetivos.join(' ')).not.toMatch(/historial|objetivo-|btn-objetivo|btn-versiones/);
  expect(siguienteMision(true)?.id).toBe('m1');
  expect(misionesDe(false)).toBe(MISIONES);
});

test('la guía resalta el menú si el usuario está en otra pantalla', () => {
  const [bloque, oferta] = MISIONES[0]!.pasos;
  expect(objetivoVisible(bloque!, '/materiales').objetivo).toBe('nav-bloques');
  expect(objetivoVisible(bloque!, '/bloques').objetivo).toBe('bloque-anadir');
  expect(objetivoVisible(oferta!, '/ofertas', 'x1').objetivo).toBe('oferta-x1');
});

test('la misión avanza con escrituras reales y se marca cumplida al terminar', () => {
  avisarRuta('/bloques');
  iniciarMision('m1');
  avisarApi('PATCH', '/api/rubros/1'); // todavía no toca
  expect(objetivo()).toBe('bloque-anadir');
  avisarApi('POST', '/api/ofertas/abc/bloques');
  expect(objetivo()).toBe('tabla-presupuesto');
  avisarApi('PATCH', '/api/rubros/1?version=2');
  expect(leerEstado()).toMatchObject({ activa: null, cumplida: 'm1', hechas: ['m1'] });
});

test('un paso de «llegar a la pantalla» se cumple si ya se está en ella', () => {
  avisarRuta('/historial');
  iniciarMision('m6');
  expect(objetivo()).toBe('historial-filtros');
});
