import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { RevisionImportacion, ResultadoImportacion } from 'tipos';
import { ErrorApi, subirArchivo } from '../lib/api';
import { money, sgn } from '../lib/formato';

const mensajeDe = (e: unknown) =>
  e instanceof ErrorApi ? e.message : 'No pudimos leer el archivo. Intente de nuevo.';

export function Importar() {
  const cliente = useQueryClient();
  const navegar = useNavigate();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [revision, setRevision] = useState<RevisionImportacion | null>(null);
  const [aviso, setAviso] = useState('');

  const revisar = useMutation({
    mutationFn: (f: File) => subirArchivo<RevisionImportacion>('/api/importar/revisar', f),
    onSuccess: setRevision,
    onError: (e) => setAviso(mensajeDe(e)),
  });
  const confirmar = useMutation({
    mutationFn: (f: File) => subirArchivo<ResultadoImportacion>('/api/importar/confirmar', f),
    onSuccess: async (r) => {
      void cliente.invalidateQueries({ queryKey: ['ofertas'] });
      await navegar({ to: '/ofertas/$id', params: { id: r.ofertaId } });
    },
    onError: (e) => setAviso(mensajeDe(e)),
  });
  const paso = confirmar.isPending ? 3 : revision ? 2 : 1;
  const r = revision?.resumen;
  const bloqueantes = revision?.problemas.filter((p) => p.bloqueante) ?? [];
  const avisos = revision?.problemas.filter((p) => !p.bloqueante) ?? [];

  const elegir = (f: File | undefined) => {
    setAviso('');
    setRevision(null);
    setArchivo(f ?? null);
    if (f) revisar.mutate(f);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold">Importar libro de Excel</h1>
      <p className="mt-1 text-sm text-slate-600">
        Suba su libro, revise lo que encontramos y confírmelo. Se crea una oferta nueva; su archivo
        no sale de este servidor.
      </p>
      <p className="mt-1 text-sm text-slate-600">
        ¿Solo quiere actualizar precios?{' '}
        <Link to="/importar/precios" className="font-medium text-blue-700 underline">
          Importar solo precios
        </Link>
        .
      </p>
      <ol className="mt-3 flex gap-4 text-sm" aria-label="Pasos">
        {['Subir', 'Revisar', 'Confirmar'].map((t, i) => (
          <li key={t} className={paso === i + 1 ? 'font-semibold' : 'text-slate-500'}>
            {i + 1}. {t}
          </li>
        ))}
      </ol>

      <label className="mt-4 block text-sm">
        Libro de Excel (.xlsx)
        <input
          type="file"
          accept=".xlsx"
          aria-label="Archivo de Excel"
          onChange={(e) => elegir(e.target.files?.[0])}
          className="mt-1 block text-sm"
        />
      </label>
      {revisar.isPending && <p className="mt-3 text-slate-500">Leyendo su libro…</p>}
      {aviso && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {aviso}
        </p>
      )}

      {revision && r && (
        <section className="mt-4">
          <h2 className="font-semibold">{revision.proyecto}</h2>
          <p className="mt-1 text-sm" data-testid="resumen-importacion">
            Encontramos {r.listas} listas, {r.insumos} insumos ({r.insumosNuevos} nuevos), {r.apus}{' '}
            APUs y 1 presupuesto de {r.rubros} rubros en {r.capitulos} capítulos.
          </p>
          {revision.cuadra?.hayCache && (
            <div
              data-testid="cuadra"
              className={
                'mt-3 rounded border p-3 text-sm ' +
                (revision.cuadra.cuadra
                  ? 'border-green-300 bg-green-50'
                  : 'border-amber-300 bg-amber-50')
              }
            >
              {revision.cuadra.cuadra ? (
                <b>
                  ✓ Cuadra con su Excel: {money(revision.cuadra.totalExcel ?? 0)} ={' '}
                  {money(revision.cuadra.totalApuflow)}
                </b>
              ) : (
                <>
                  <b>
                    No cuadra con su Excel: {money(revision.cuadra.totalExcel ?? 0)} en su libro,{' '}
                    {money(revision.cuadra.totalApuflow)} en APUflow.
                  </b>
                  {revision.cuadra.rubrosDistintos.length > 0 && (
                    <ul className="mt-1 list-disc pl-5">
                      {revision.cuadra.rubrosDistintos.map((x) => (
                        <li key={x.fila}>
                          Fila {x.fila}, {x.descripcion}: su Excel {money(x.excel)}, APUflow{' '}
                          {money(x.apuflow)} ({sgn(x.apuflow - x.excel)})
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
          {bloqueantes.length > 0 && (
            <div className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm">
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
            <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
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
            <button
              disabled={!revision.puedeConfirmar || confirmar.isPending}
              onClick={() => archivo && confirmar.mutate(archivo)}
              className="rounded bg-slate-900 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              {confirmar.isPending ? 'Importando…' : 'Importar como oferta nueva'}
            </button>
            <Link to="/ofertas" className="rounded border border-slate-300 px-3 py-1 text-sm">
              Cancelar
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
