import { useQuery } from '@tanstack/react-query';
import { consultaEmpresa } from '../pantallas/Empresa';

/** Vista sencilla de la empresa: esconde lo que no usa quien presupuesta solo (D18). */
export function useSencilla() {
  const { data } = useQuery(consultaEmpresa);
  return data?.vista === 'sencilla';
}
