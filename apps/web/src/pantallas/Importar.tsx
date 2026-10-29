import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { RevisionImportacion, ResultadoImportacion } from 'tipos';
import { ErrorApi, subirArchivo } from '../lib/api';
import { money, sgn } from '../lib/formato';
import { Check, FileSpreadsheet } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Cargando } from '../ui/estado';
import { Label } from '../ui/label';

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
        <Button variant="link" asChild>
          <Link to="/importar/precios">Importar solo precios</Link>
        </Button>
        .
      </p>
      <ol className="mt-4 flex items-center gap-2 text-sm" aria-label="Pasos">
        {['Subir', 'Revisar', 'Confirmar'].map((t, i) => (
          <li
            key={t}
            aria-current={paso === i + 1 ? 'step' : undefined}
            className={
              'flex items-center gap-1.5 ' +
              (paso === i + 1 ? 'font-semibold text-slate-900' : 'text-slate-500')
            }
          >
            <span
              aria-hidden
              className={
                'grid size-5 place-items-center rounded-full text-xs ' +
                (paso > i + 1
                  ? 'bg-emerald-600 text-white'
                  : paso === i + 1
                    ? 'bg-primario text-white'
                    : 'bg-slate-200 text-slate-600')
              }
            >
              {paso > i + 1 ? <Check className="size-3" /> : i + 1}
            </span>
            {i + 1}. {t}
            {i < 2 && <span aria-hidden className="mx-1 h-px w-6 bg-borde" />}
          </li>
        ))}
      </ol>

      <Card className="mt-4 p-4">
        <Label className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5">
            <FileSpreadsheet aria-hidden className="size-4 text-primario" />
            Libro de Excel (.xlsx)
          </span>
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
                'mt-3 rounded-md border p-3 text-sm ' +
                (revision.cuadra.cuadra
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-amber-200 bg-amber-50 text-amber-900')
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
                    {money(revision.cuadra.totalApuflow)} en Turing APU.
                  </b>
                  {revision.cuadra.rubrosDistintos.length > 0 && (
                    <ul className="mt-1 list-disc pl-5">
                      {revision.cuadra.rubrosDistintos.map((x) => (
                        <li key={x.fila}>
                          Fila {x.fila}, {x.descripcion}: su Excel {money(x.excel)}, Turing APU{' '}
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
              {confirmar.isPending ? 'Importando…' : 'Importar como oferta nueva'}
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/ofertas">Cancelar</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
