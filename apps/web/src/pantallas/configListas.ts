import type { TipoInsumo } from 'tipos';

export interface ConfigLista {
  tipo: TipoInsumo;
  titulo: string;
  singular: string; // para «Agregar material» y «Ningún material coincide»
  plural: string; // para el contador y los mensajes: "materiales"
  buscar: string; // aria-label del buscador
  tabla: string; // aria-label de la tabla
  conFactor?: boolean;
  herramientaMenor?: boolean;
}

export const LISTAS: Record<'materiales' | 'equipos' | 'manoObra' | 'transporte', ConfigLista> = {
  materiales: {
    tipo: 'MA',
    titulo: 'Materiales',
    singular: 'material',
    plural: 'materiales',
    buscar: 'Buscar material',
    tabla: 'Lista de materiales',
    conFactor: true,
  },
  equipos: {
    tipo: 'EQ',
    titulo: 'Equipos',
    singular: 'equipo',
    plural: 'equipos',
    buscar: 'Buscar equipo',
    tabla: 'Lista de equipos',
    herramientaMenor: true,
  },
  manoObra: {
    tipo: 'MO',
    titulo: 'Mano de obra',
    singular: 'cargo',
    plural: 'cargos',
    buscar: 'Buscar cargo',
    tabla: 'Lista de mano de obra',
  },
  transporte: {
    tipo: 'TR',
    titulo: 'Transporte',
    singular: 'tarifa',
    plural: 'tarifas',
    buscar: 'Buscar tarifa',
    tabla: 'Lista de transporte',
  },
};
