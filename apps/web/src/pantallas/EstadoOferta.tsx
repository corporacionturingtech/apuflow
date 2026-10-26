import type { Oferta } from 'tipos';
import { Badge } from '../ui/badge';

export const EstadoOferta = ({ estado }: { estado: Oferta['estado'] }) =>
  estado === 'emitida' ? <Badge variant="exito">Emitida</Badge> : <Badge>Borrador</Badge>;
