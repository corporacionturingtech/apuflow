import { beforeEach, expect, test } from 'vitest';
import { objetivoVisible } from './BarraGuia';
import {
  avisarApi,
  avisarRuta,
  cargarUsuario,
  iniciarMision,
  leerEstado,
  pasoActual,
} from './guia';
import { MISIONES } from './misiones';

let n = 0;
beforeEach(() => cargarUsuario(`u${++n}`));
const objetivo = () => pasoActual(leerEstado())?.objetivo;

test('son siete misiones y cada paso tiene objetivo y texto', () => {
  expect(MISIONES).toHaveLength(7);
  for (const p of MISIONES.flatMap((m) => m.pasos)) expect(p.objetivo && p.texto).toBeTruthy();
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
