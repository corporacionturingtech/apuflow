import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { TriangleAlert } from 'lucide-react';
import { consultaYo } from '../sesion';
import { consultaLicencia } from '../pantallas/Licencia';

// El administrador ve los avisos de vencimiento; todos ven el modo solo lectura.
export function AvisoLicencia() {
  const { data: usuario } = useQuery(consultaYo);
  const { data: l } = useQuery({ ...consultaLicencia, refetchInterval: 3_600_000 });
  if (!l || !usuario) return null;
  const admin = usuario.rol === 'admin';
  let texto: string | null = null;
  if (l.estado === 'solo_lectura') {
    texto = 'La licencia está vencida: puede ver y exportar, pero no editar.';
  } else if (admin && l.estado === 'gracia') {
    texto = `La licencia venció. Le quedan ${l.diasDeGracia} días de gracia antes de pasar a solo lectura.`;
  } else if (admin && l.estado === 'por_vencer') {
    texto = `La licencia vence en ${l.diasParaVencer} días.`;
  }
  if (!texto) return null;
  return (
    <div
      role="status"
      className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
    >
      <TriangleAlert className="size-4 shrink-0 text-amber-600" aria-hidden />
      <span className="flex-1">{texto}</span>
      {admin && (
        <Link to="/configuracion/licencia" className="font-medium underline underline-offset-2">
          Renovar licencia
        </Link>
      )}
    </div>
  );
}
