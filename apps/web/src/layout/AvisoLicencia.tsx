import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
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
    <div role="status" className="mb-4 rounded bg-amber-100 px-3 py-2 text-sm text-amber-900">
      {texto}{' '}
      {admin && (
        <Link to="/configuracion/licencia" className="underline">
          Renovar licencia
        </Link>
      )}
    </div>
  );
}
