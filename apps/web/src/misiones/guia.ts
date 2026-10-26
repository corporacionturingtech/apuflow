import { useSyncExternalStore } from 'react';
import { MISIONES, RUTAS, type Mision, type Paso } from './misiones';

export interface Estado {
  /** Misión en curso (id) y paso actual (índice). */
  activa: string | null;
  paso: number;
  hechas: string[];
  /** Misión recién cumplida: la guía muestra su «qué gana». */
  cumplida: string | null;
}

const VACIO: Estado = { activa: null, paso: 0, hechas: [], cumplida: null };
let estado: Estado = VACIO;
let usuario: string | null = null;
let ruta = '/';
const oyentes = new Set<() => void>();

const llave = (u: string) => `apuflow.misiones.${u}`;

function poner(nuevo: Estado) {
  estado = nuevo;
  if (usuario) {
    try {
      localStorage.setItem(llave(usuario), JSON.stringify({ hechas: nuevo.hechas }));
    } catch {
      // sin almacenamiento: el avance dura mientras la pestaña esté abierta
    }
  }
  oyentes.forEach((o) => o());
}

/** Estado actual, para quien no esté dentro de un componente. */
export const leerEstado = () => estado;

export function misionPorId(id: string | null): Mision | undefined {
  return MISIONES.find((m) => m.id === id);
}

export function pasoActual(e: Estado): Paso | undefined {
  return misionPorId(e.activa)?.pasos[e.paso];
}

/** Carga el avance guardado del usuario (las misiones cumplidas), una vez por usuario. */
export function cargarUsuario(id: string) {
  if (usuario === id) return;
  usuario = id;
  let hechas: string[] = [];
  try {
    hechas = JSON.parse(localStorage.getItem(llave(id)) ?? '{}').hechas ?? [];
  } catch {
    // almacenamiento no disponible o dañado
  }
  poner({ ...VACIO, hechas });
}

export function iniciarMision(id: string) {
  poner({ ...estado, activa: id, paso: 0, cumplida: null });
  revisarPantalla();
}

export function salirDeMision() {
  poner({ ...estado, activa: null, paso: 0 });
}

export function cerrarCumplida() {
  poner({ ...estado, cumplida: null });
}

export function siguienteMision(): Mision | undefined {
  return MISIONES.find((m) => !estado.hechas.includes(m.id));
}

function avanzar() {
  const m = misionPorId(estado.activa);
  if (!m) return;
  if (estado.paso + 1 < m.pasos.length) {
    poner({ ...estado, paso: estado.paso + 1 });
    revisarPantalla();
    return;
  }
  poner({
    activa: null,
    paso: 0,
    hechas: [...new Set([...estado.hechas, m.id])],
    cumplida: m.id,
  });
}

/** Un paso que termina «llegando a una pantalla» se cumple si ya se está en ella. */
function revisarPantalla() {
  const f = pasoActual(estado)?.fin;
  if (f && 'pantalla' in f && RUTAS[f.pantalla].test(ruta)) avanzar();
}

export function avisarRuta(ruta_: string) {
  ruta = ruta_;
  revisarPantalla();
}

/** La web llama a la API con `api()`: cada llamada correcta pasa por aquí. */
export function avisarApi(metodo: string, url: string) {
  const f = pasoActual(estado)?.fin;
  if (f && 'api' in f && f.api.test(`${metodo} ${url}`)) avanzar();
}

export function avisarClic(guia: string) {
  const p = pasoActual(estado);
  if (p && 'clic' in p.fin && p.objetivo === guia) avanzar();
}

export function useGuia(): Estado {
  return useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    () => estado,
  );
}
