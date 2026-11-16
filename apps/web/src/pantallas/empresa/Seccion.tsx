import { useId, type ReactNode } from 'react';

/** Grupo de campos con su título a la izquierda (se apila en pantallas angostas). */
export function Seccion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="grid gap-4 border-t border-borde p-5 first:border-t-0 md:grid-cols-[180px_1fr]"
    >
      <div>
        <h2 id={id} className="text-sm font-semibold text-slate-900">
          {titulo}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">{descripcion}</p>
      </div>
      <div className="grid content-start gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
