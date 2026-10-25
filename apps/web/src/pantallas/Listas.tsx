import { ListaPrecios, LISTAS } from './ListaPrecios';

export const Materiales = () => <ListaPrecios config={LISTAS.materiales} />;
export const Equipos = () => <ListaPrecios config={LISTAS.equipos} />;
export const ManoObra = () => <ListaPrecios config={LISTAS.manoObra} />;
export const Transporte = () => <ListaPrecios config={LISTAS.transporte} />;
