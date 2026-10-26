export type Pantalla = 'bloques' | 'oferta' | 'materiales' | 'apus' | 'apu' | 'historial';

/** Cómo termina un paso: una escritura en la API, un clic en el objetivo o llegar a una pantalla. */
export type Fin = { api: RegExp } | { clic: true } | { pantalla: Pantalla };

export interface Paso {
  /** Pantalla donde ocurre; si el usuario está en otra, la guía resalta el menú que lleva a ella. */
  pantalla: Pantalla;
  /** Valor de `data-guia` del elemento que se resalta. */
  objetivo: string;
  texto: string;
  fin: Fin;
}

export interface Mision {
  id: string;
  titulo: string;
  frase: string;
  gana: string;
  pasos: Paso[];
}

export const RUTAS: Record<Pantalla, RegExp> = {
  bloques: /^\/bloques$/,
  oferta: /^\/ofertas\/[^/]+$/,
  materiales: /^\/materiales$/,
  apus: /^\/apus$/,
  apu: /^\/apus\/[^/]+$/,
  historial: /^\/historial$/,
};

export const NOMBRE_PANTALLA: Record<Pantalla, string> = {
  bloques: 'Bloques',
  oferta: 'Ofertas',
  materiales: 'Materiales',
  apus: 'APUs',
  apu: 'APUs',
  historial: 'Historial',
};

const INDIRECTOS = /^PATCH \/api\/ofertas\/[^/]+\/indirectos\//;

export const MISIONES: Mision[] = [
  {
    id: 'm1',
    titulo: 'Cotizar rápido con bloques',
    frase: '«Lo que más necesitamos es que podamos cotizar las cosas rápido.»',
    gana: 'Una bahía completa entra a la oferta con un clic, con todos sus rubros, cantidades y APUs. Lo que hoy es copiar hojas y revisar fórmulas pasa a ser elegir un bloque y ajustar cantidades.',
    pasos: [
      {
        pantalla: 'bloques',
        objetivo: 'bloque-anadir',
        texto: 'Añada un bloque a la oferta. Entra completo, con sus rubros, cantidades y APUs.',
        fin: { api: /^POST \/api\/ofertas\/[^/]+\/bloques$/ },
      },
      {
        pantalla: 'oferta',
        objetivo: 'tabla-presupuesto',
        texto:
          'Cambie una cantidad del capítulo nuevo (por ejemplo los m³ de excavación) y pulse Enter. La celda queda en amarillo, como en su Excel.',
        fin: { api: /^PATCH \/api\/rubros\// },
      },
    ],
  },
  {
    id: 'm2',
    titulo: 'Actualizar un precio a mano',
    frase: '«Es mucho mejor que nosotros pongamos el valor.»',
    gana: 'El precio se escribe una sola vez, en la lista. Todos los APUs y rubros que lo usan se recalculan solos, y queda el valor anterior para comparar.',
    pasos: [
      {
        pantalla: 'materiales',
        objetivo: 'tabla-lista',
        texto:
          'El cobre subió. Escriba el nuevo precio de un material (por ejemplo 10,40) y pulse Enter.',
        fin: { api: /^PATCH \/api\/insumos\/[^/]+$/ },
      },
      {
        pantalla: 'materiales',
        objetivo: 'ver-cambio',
        texto:
          'Mire el aviso: cuántos APUs y rubros se recalcularon y cuánto cambió la oferta. Pulse «Ver qué cambió».',
        fin: { clic: true },
      },
    ],
  },
  {
    id: 'm3',
    titulo: 'Ver todo el APU en una pantalla',
    frase:
      '«Revisar que se haya incluido una grúa, un ingeniero eléctrico, ayudantes, cuántos van a ser de cada uno.»',
    gana: 'Cada APU muestra juntos equipos, mano de obra, materiales y transporte. Se revisa en segundos que estén la grúa, el ingeniero y los ayudantes, y cuántos de cada uno.',
    pasos: [
      {
        pantalla: 'apus',
        objetivo: 'apu-primero',
        texto: 'Abra un APU de la biblioteca.',
        fin: { pantalla: 'apu' },
      },
      {
        pantalla: 'apu',
        objetivo: 'apu-MO',
        texto:
          'Aquí ve la mano de obra de un vistazo. Cambie la cantidad de una persona (por ejemplo, de 2 a 3 ayudantes) y pulse Enter.',
        fin: { api: /^PATCH \/api\/apus\/[^/]+\/lineas\// },
      },
    ],
  },
  {
    id: 'm4',
    titulo: 'Indirectos y utilidad',
    frase: '«Si tiene tanto porcentaje de gastos, el porcentaje de utilidad, todas esas cosas.»',
    gana: 'Los indirectos y la utilidad se escriben en un solo lugar y se aplican a todos los precios unitarios de la oferta. Cada APU muestra el mismo cálculo al pie.',
    pasos: [
      {
        pantalla: 'oferta',
        objetivo: 'btn-indirectos',
        texto: 'Abra el panel «Indirectos y utilidad».',
        fin: { clic: true },
      },
      {
        pantalla: 'oferta',
        objetivo: 'panel-indirectos',
        texto: 'Escriba su porcentaje de gastos generales y pulse Enter.',
        fin: { api: INDIRECTOS },
      },
      {
        pantalla: 'oferta',
        objetivo: 'panel-indirectos',
        texto: 'Ahora la utilidad. El precio de cada rubro y el total cambian solos.',
        fin: { api: INDIRECTOS },
      },
    ],
  },
  {
    id: 'm5',
    titulo: 'Llegar al costo objetivo',
    frase: '«Esto tengo yo, cuánto me ofreces. Entonces ese es nuestro costo objetivo.»',
    gana: 'Con el costo referencial del cliente a la vista, saben cuánto falta, qué rubros pesan más y cuánto cierra cada ajuste. Cada versión queda guardada para comparar.',
    pasos: [
      {
        pantalla: 'oferta',
        objetivo: 'btn-objetivo',
        texto: 'Abra el panel «Costo objetivo».',
        fin: { clic: true },
      },
      {
        pantalla: 'oferta',
        objetivo: 'panel-objetivo',
        texto: 'Escriba el costo referencial que les dio el cliente y pulse Enter.',
        fin: { api: /^PATCH \/api\/ofertas\/[^/]+$/ },
      },
      {
        pantalla: 'oferta',
        objetivo: 'btn-versiones',
        texto: 'Antes de ajustar, abra «Versiones» para guardar esta oferta como está.',
        fin: { clic: true },
      },
      {
        pantalla: 'oferta',
        objetivo: 'panel-versiones',
        texto: 'Póngale un nombre y pulse «Guardar versión».',
        fin: { api: /^POST \/api\/ofertas\/[^/]+\/versiones$/ },
      },
      {
        pantalla: 'oferta',
        objetivo: 'version-comparar',
        texto: 'Pulse la versión guardada para compararla con la oferta actual, rubro por rubro.',
        fin: { clic: true },
      },
    ],
  },
  {
    id: 'm6',
    titulo: 'Quién cambió qué',
    frase: '«Que todo sea como en línea y que todos podamos usar al mismo tiempo.»',
    gana: 'Civil, eléctrico y mecánico arman la misma oferta al mismo tiempo, cada uno en sus rubros, y el historial dice quién cambió qué, cuándo y de cuánto a cuánto.',
    pasos: [
      {
        pantalla: 'historial',
        objetivo: 'nav-historial',
        texto: 'Abra el «Historial»: todo lo que su equipo cambió, con nombre y hora.',
        fin: { pantalla: 'historial' },
      },
      {
        pantalla: 'historial',
        objetivo: 'historial-filtros',
        texto: 'Filtre por «Qué cambió» (por ejemplo, Precios) y verá solo esos cambios.',
        fin: { api: /^GET \/api\/bitacora\?.*entidad=/ },
      },
    ],
  },
  {
    id: 'm7',
    titulo: 'Exportar a Excel',
    frase: 'Lo que se envía al cliente, en Excel y con sus mismas columnas.',
    gana: 'La oferta sale en Excel con las mismas hojas y columnas de su libro, y con fórmulas: si cambian un precio en la hoja Materiales del archivo, todo se recalcula.',
    pasos: [
      {
        pantalla: 'oferta',
        objetivo: 'btn-exportar',
        texto: 'Descargue la oferta en Excel: mismas hojas y columnas que su libro, con fórmulas.',
        fin: { clic: true },
      },
    ],
  },
];
