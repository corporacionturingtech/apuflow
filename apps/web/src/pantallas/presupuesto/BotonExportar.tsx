import { useState } from 'react';

/** Descarga el libro de la oferta. Siempre disponible: exportar no depende de la licencia. */
export function BotonExportar({ ofertaId, nombre }: { ofertaId: string; nombre: string }) {
  const [estado, setEstado] = useState<'listo' | 'generando' | 'error'>('listo');

  async function exportar() {
    setEstado('generando');
    try {
      const res = await fetch(`/api/ofertas/${ofertaId}/exportar`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `${nombre.replace(/[^\w.-]+/g, '_')}.xlsx`,
      });
      a.click();
      URL.revokeObjectURL(url);
      setEstado('listo');
    } catch {
      setEstado('error');
    }
  }

  return (
    <span className="ml-auto flex items-baseline gap-2 text-sm">
      {estado === 'error' && (
        <span role="alert" className="text-red-700">
          No se pudo generar el Excel. Intente de nuevo.
        </span>
      )}
      <button
        type="button"
        data-guia="btn-exportar"
        disabled={estado === 'generando'}
        onClick={exportar}
        className="rounded border border-slate-300 px-2 py-0.5"
      >
        {estado === 'generando' ? 'Generando…' : 'Exportar a Excel'}
      </button>
    </span>
  );
}
