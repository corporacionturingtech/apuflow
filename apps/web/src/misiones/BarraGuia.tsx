import { useQuery } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import { useEffect } from 'react';
import { api } from '../lib/api';
import { consultaYo } from '../sesion';
import {
  avisarClic,
  avisarRuta,
  cargarUsuario,
  cerrarCumplida,
  iniciarMision,
  misionPorId,
  pasoActual,
  salirDeMision,
  siguienteMision,
  useGuia,
} from './guia';
import { MISIONES, NOMBRE_PANTALLA, RUTAS, type Paso } from './misiones';

const NAV = {
  bloques: 'nav-bloques',
  materiales: 'nav-materiales',
  apus: 'nav-apus',
  apu: 'nav-apus',
  historial: 'nav-historial',
  oferta: 'nav-ofertas',
} as const;

/** Qué resaltar ahora: el objetivo del paso, o el menú que lleva a su pantalla. */
export function objetivoVisible(p: Paso, ruta: string, ofertaId?: string) {
  if (RUTAS[p.pantalla].test(ruta)) return { objetivo: p.objetivo, texto: p.texto };
  if (p.pantalla === 'oferta' && ruta === '/ofertas' && ofertaId)
    return { objetivo: `oferta-${ofertaId}`, texto: 'Abra la oferta de ejemplo.' };
  if (p.pantalla === 'apu' && ruta === '/apus')
    return { objetivo: 'apu-primero', texto: 'Abra un APU de la biblioteca.' };
  return { objetivo: NAV[p.pantalla], texto: `Abra «${NOMBRE_PANTALLA[p.pantalla]}» en el menú.` };
}

function resaltar(objetivo: string | null) {
  const ahora = objetivo ? document.querySelector(`[data-guia="${objetivo}"]`) : null;
  document.querySelectorAll('.guia-objetivo').forEach((e) => {
    if (e !== ahora) e.classList.remove('guia-objetivo');
  });
  ahora?.classList.add('guia-objetivo');
  return ahora;
}

export function BarraGuia() {
  const g = useGuia();
  const { data: yo } = useQuery(consultaYo);
  const ruta = useRouterState({ select: (s) => s.location.pathname });
  const mision = misionPorId(g.activa);
  const paso = pasoActual(g);
  const { data: demo } = useQuery({
    queryKey: ['demo'],
    queryFn: () => api<{ ofertaId: string | null }>('/api/demo'),
    enabled: !!mision,
  });
  const vista = paso ? objetivoVisible(paso, ruta, demo?.ofertaId ?? undefined) : null;
  const objetivo = vista?.objetivo ?? null;

  useEffect(() => {
    if (yo) cargarUsuario(yo.id);
  }, [yo]);
  useEffect(() => avisarRuta(ruta), [ruta]);

  useEffect(() => {
    const alClic = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest('[data-guia]');
      if (el) avisarClic(el.getAttribute('data-guia')!);
    };
    document.addEventListener('click', alClic, true);
    return () => document.removeEventListener('click', alClic, true);
  }, []);

  useEffect(() => {
    resaltar(objetivo);
    if (!objetivo) return;
    let avisado = false;
    const mirar = () => {
      const el = resaltar(objetivo);
      if (el && !avisado) {
        avisado = true;
        el.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    };
    mirar();
    const o = new MutationObserver(mirar);
    o.observe(document.body, { childList: true, subtree: true });
    return () => {
      o.disconnect();
      resaltar(null);
    };
  }, [objetivo, g.activa, g.paso]);

  const cumplida = misionPorId(g.cumplida);
  const siguiente = siguienteMision();
  return (
    <>
      {mision && paso && vista && (
        <div
          role="region"
          aria-label="Guía de la misión"
          className="mb-3 flex items-center gap-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm"
        >
          <span className="font-semibold">
            Misión {MISIONES.indexOf(mision) + 1} · paso {g.paso + 1} de {mision.pasos.length}
          </span>
          <span className="flex-1">
            {vista.texto} <small className="text-slate-500">{mision.titulo}</small>
          </span>
          <button type="button" onClick={salirDeMision} className="text-slate-600 underline">
            Salir de la misión
          </button>
        </div>
      )}
      {cumplida && (
        <div
          role="status"
          aria-label="Misión cumplida"
          className="mb-3 rounded border border-green-300 bg-green-50 p-3 text-sm"
        >
          <p className="font-semibold">
            Misión {MISIONES.indexOf(cumplida) + 1} cumplida: {cumplida.titulo}
          </p>
          <p className="mt-1">
            <b>Qué gana su empresa aquí.</b> {cumplida.gana}
          </p>
          <div className="mt-2 flex gap-3">
            {siguiente && (
              <button
                type="button"
                onClick={() => iniciarMision(siguiente.id)}
                className="rounded border border-slate-900 bg-slate-900 px-2 py-0.5 text-white"
              >
                Siguiente: {siguiente.titulo}
              </button>
            )}
            <button type="button" onClick={cerrarCumplida} className="underline">
              Seguir explorando
            </button>
          </div>
        </div>
      )}
    </>
  );
}
