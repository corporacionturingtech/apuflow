import { calcularApu, type Apu as ApuMotor, type Listas, type LineaEntrada } from 'motor';
import type { ApuDetalle, TipoInsumo } from 'tipos';

export const COMPONENTES = [
  {
    tipo: 'EQ',
    titulo: 'Equipos',
    letra: 'M',
    singular: 'equipo',
    lista: '/equipos',
    clave: 'equipos',
  },
  {
    tipo: 'MO',
    titulo: 'Mano de obra',
    letra: 'N',
    singular: 'persona',
    lista: '/mano-de-obra',
    clave: 'manoObra',
  },
  {
    tipo: 'MA',
    titulo: 'Materiales',
    letra: 'O',
    singular: 'material',
    lista: '/materiales',
    clave: 'materiales',
  },
  {
    tipo: 'TR',
    titulo: 'Transporte',
    letra: 'P',
    singular: 'transporte',
    lista: '/transporte',
    clave: 'transporte',
  },
] as const satisfies readonly {
  tipo: TipoInsumo;
  titulo: string;
  letra: string;
  singular: string;
  lista: string;
  clave: keyof Pick<ApuMotor, 'equipos' | 'manoObra' | 'materiales' | 'transporte'>;
}[];

/** Arma las entradas del motor desde el detalle: la web no multiplica nada por su cuenta. */
export function calcular(d: ApuDetalle, indirectos: number) {
  const por = (tipo: TipoInsumo) => d.lineasApu.filter((l) => l.tipo === tipo);
  const entrada = (tipo: TipoInsumo): LineaEntrada[] =>
    por(tipo).map((l) => [l.insumoId, l.cantidad] as const);
  const lista = (tipo: TipoInsumo) => por(tipo).map((l) => ({ id: l.insumoId, p: l.pu }));
  const listas: Listas = {
    materiales: por('MA').map((l) => ({ id: l.insumoId, pu: l.pu })),
    equipos: lista('EQ'),
    manoObra: lista('MO'),
    transporte: lista('TR'),
  };
  const apu: ApuMotor = {
    id: d.id,
    rendimiento: d.rendimiento,
    equipos: entrada('EQ'),
    manoObra: entrada('MO'),
    materiales: entrada('MA'),
    transporte: entrada('TR'),
  };
  return calcularApu(apu, listas, {
    factor: d.factor,
    herramientaMenor: d.herramientaMenor,
    iva: 0,
    indirectos: [{ p: indirectos }],
  });
}
