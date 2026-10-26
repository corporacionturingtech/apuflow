import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import type { RevisionPrecios, ResultadoPrecios } from 'tipos';
import { ErrorApi, subirArchivo } from '../lib/api';
import { money, sgn } from '../lib/formato';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Cargando } from '../ui/estado';
import { Label } from '../ui/label';

const mensajeDe = (e: unknown) =>
  e instanceof ErrorApi ? e.message : 'No pudimos leer el archivo. Intente de nuevo.';
const TIPO = { MA: 'Materiales', EQ: 'Equipos', MO: 'Mano de obra', TR: 'Transporte' } as const;

/** Solo precios: se ve qué cambia y qué efecto tiene en las ofertas antes de confirmar. */
export function ImportarPrecios() {
  const cliente = useQueryClient();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [revision, setRevision] = useState<RevisionPrecios | null>(null);
  const [detalle, setDetalle] = useState(false);
  const [aviso, setAviso] = useState('');
  const [hecho, setHecho] = useState<ResultadoPrecios | null>(null);

  const revisar = useMutation({
    mutationFn: (f: File) => subirArchivo<RevisionPrecios>('/api/importar/precios/revisar', f),
    onSuccess: setRevision,
    onError: (e) => setAviso(mensajeDe(e)),
  });
  const confirmar = useMutation({
    mutationFn: (f: File) => subirArchivo<ResultadoPrecios>('/api/importar/precios/confirmar', f),
    onSuccess: (r) => {
      setHecho(r);
      setRevision(null);
      void cliente.invalidateQueries();
    },
    onError: (e) => setAviso(mensajeDe(e)),
  });

  const elegir = (f: File | undefined) => {
    setAviso('');
    setRevision(null);
    setHecho(null);
    setArchivo(f ?? null);
    if (f) revisar.mutate(f);
  };
  const bloqueantes = revision?.problemas.filter((p) => p.bloqueante) ?? [];
  const avisos = revision?.problemas.filter((p) => !p.bloqueante) ?? [];
  const im = revision?.impacto;

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold">Importar solo precios</h1>
      <p className="mt-1 text-sm text-slate-600">
        Suba un libro con las hojas Materiales, Equipos, Mano Obra o Transporte. Se emparejan por
        descripción; nada cambia hasta que usted confirme.
      </p>
      <Card className="mt-4 p-4">
        <Label className="flex flex-col gap-1">
          Libro de Excel (.xlsx)
          <input
            type="file"
            accept=".xlsx"
            aria-label="Archivo de Excel"
            onChange={(e) => elegir(e.target.files?.[0])}
            className="mt-1 block text-sm font-normal file:mr-3 file:h-8 file:rounded-md file:border file:border-borde file:bg-white file:px-3 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50"
          />
        </Label>
      </Card>
      {revisar.isPending && <Cargando texto="Leyendo su libro…" />}
      {aviso && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {aviso}
        </p>
      )}
      {hecho && (
        <p
          role="status"
          className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          Se actualizaron {hecho.actualizados} precios. Las ofertas ya se recalcularon;{' '}
          <Link to="/materiales" className="font-medium text-blue-700 underline">
            ver las listas
          </Link>
          .
        </p>
      )}

      {revision && im && (
        <section className="mt-4">
          <p className="text-sm" data-testid="resumen-precios">
            {revision.cambios.length === 0
              ? 'Ningún precio cambia.'
              : `Cambian ${revision.cambios.length} precios.`}{' '}
            {revision.sinCambio} ya están al día
            {revision.noEncontrados.length > 0 &&
              `; ${revision.noEncontrados.length} no existen en APUflow y se omiten`}
            .
          </p>
          {revision.cambios.length > 0 && (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left">
                  <th className="py-1">Insumo</th>
                  <th>Lista</th>
                  <th className="text-right">Actual</th>
                  <th className="text-right">Nuevo</th>
                  <th className="text-right">Variación</th>
                </tr>
              </thead>
              <tbody>
                {revision.cambios.map((c) => (
                  <tr key={c.insumoId} className="border-b border-slate-100">
                    <td className="py-1">{c.descripcion}</td>
                    <td>{TIPO[c.tipo]}</td>
                    <td className="text-right">{money(Number(c.puActual))}</td>
                    <td className="text-right font-medium">{money(Number(c.puNuevo))}</td>
                    <td className="text-right">{sgn(Number(c.puNuevo) - Number(c.puActual))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {revision.cambios.length > 0 && (
            <div className="mt-3 rounded-md border border-primario/25 bg-primario/5 p-3 text-sm">
              {im.rubros === 0 ? (
                'Ninguna oferta usa estos precios todavía.'
              ) : (
                <>
                  Afectará {im.apus} APUs, {im.rubros} rubros, {sgn(Number(im.diferencia))}.{' '}
                  <Button
                    type="button"
                    variant="link"
                    aria-expanded={detalle}
                    onClick={() => setDetalle((v) => !v)}
                  >
                    Ver qué cambiaría
                  </Button>
                  {detalle && (
                    <ul className="mt-2 space-y-1">
                      {im.ofertas.map((o) => (
                        <li key={o.id}>
                          <b>{o.nombre}</b>: {o.apus} APUs, {o.rubros} rubros · subtotal{' '}
                          <s>{money(Number(o.antes))}</s> → <b>{money(Number(o.despues))}</b> (
                          {sgn(Number(o.despues) - Number(o.antes))})
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
          {revision.noEncontrados.length > 0 && (
            <p className="mt-3 text-sm text-slate-600">
              No existen en APUflow: {revision.noEncontrados.slice(0, 8).join(', ')}
              {revision.noEncontrados.length > 8 && ` y ${revision.noEncontrados.length - 8} más`}.
            </p>
          )}
          {bloqueantes.length > 0 && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <b>Hay que corregir esto en su libro antes de importar:</b>
              <ul className="mt-1 list-disc pl-5">
                {bloqueantes.map((p, i) => (
                  <li key={i}>
                    {p.hoja}
                    {p.fila ? `, fila ${p.fila}` : ''}: {p.mensaje}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {avisos.length > 0 && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <b>Tenga en cuenta:</b>
              <ul className="mt-1 list-disc pl-5">
                {avisos.map((p, i) => (
                  <li key={i}>
                    {p.hoja}
                    {p.fila ? `, fila ${p.fila}` : ''}: {p.mensaje}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button
              disabled={!revision.puedeConfirmar || confirmar.isPending}
              onClick={() => archivo && confirmar.mutate(archivo)}
            >
              {confirmar.isPending
                ? 'Actualizando…'
                : `Actualizar ${revision.cambios.length} precios`}
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/materiales">Cancelar</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
