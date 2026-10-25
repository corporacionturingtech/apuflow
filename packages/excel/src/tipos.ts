export type TipoInsumo = 'MA' | 'EQ' | 'MO' | 'TR';

export interface InsumoLibro {
  id: string;
  tipo: TipoInsumo;
  descripcion: string;
  unidad: string;
  pu: string;
  seccion: string | null;
}

export interface ApuLibro {
  id: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  disciplina: string | null;
  rendimiento: string;
  herramientaMenor: string;
  lineas: { insumoId: string; cantidad: string }[];
}

/** Todo lo que el libro necesita: el motor calcula, aquí solo se escribe. */
export interface LibroEntrada {
  datos: {
    proyecto: string;
    cliente: string;
    tipo: 'publico' | 'privado';
    fecha: string;
    empresa: string;
  };
  factor: string;
  iva: string;
  /** % de herramienta menor de la empresa (cada APU puede tener el suyo). */
  herramientaMenor: string;
  indirectos: { nombre: string; porcentaje: string }[];
  insumos: InsumoLibro[];
  apus: ApuLibro[];
  capitulos: { id: string; nombre: string }[];
  rubros: {
    capituloId: string;
    apuId: string;
    codigo: string;
    cantidad: string;
    cpc: string | null;
    origen: string | null;
    vae: string | null;
  }[];
}
