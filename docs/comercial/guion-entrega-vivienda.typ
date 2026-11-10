// Guion de entrega de Turing APU a una constructora de vivienda — USO INTERNO de Turingtech.
// Acompaña a guia-vivienda.typ (que sí se entrega al cliente). No poner datos de clientes aquí.
// Compilar desde la raíz del repo:
//   typst compile --root docs/comercial docs/comercial/guion-entrega-vivienda.typ

#import "comun-guias.typ": *

#show: guia.with("Guion de entrega · vivienda", [Turing APU · Guion de entrega para vivienda · Uso interno])

#block(width: 100%, fill: navy, inset: (x: 20pt, y: 18pt), radius: 10pt)[
  #logo(alto: 13pt, oscuro: true)
  #v(10pt)
  #text(size: 20pt, weight: "bold", fill: white)[Guion de entrega: constructora de vivienda]
  #v(4pt)
  #text(size: 10.5pt, fill: rgb("#CBD5E1"))[Uso interno. Reunión de 30 minutos para que el cliente salga cotizando una obra real con sus precios.]
]

== Antes de la reunión
#casilla[La instancia del cliente abre con HTTPS y su usuario entra (probarlo con la cuenta de soporte, nunca con la del cliente).]
#casilla[Avisos de uso activos: al entrar con el usuario del cliente debería llegar «… entró a Turing APU» al grupo de Telegram.]
#casilla[Empresa en *vista sencilla*, ofertas privadas por defecto y biblioteca de vivienda cargada.]
#casilla[Las ofertas nuevas nacen con indirectos (12 % · 3 % · 10 %). Si no, abrir la oferta de ejemplo › Indirectos › «Usar estos porcentajes en las ofertas nuevas».]
#casilla[Pedirle por WhatsApp, un día antes: precio del cemento, varilla, bloque, arena y ripio con su proveedor, jornal del peón y del albañil, su % de utilidad y los m² de una obra que esté cotizando.]
#casilla[Enviarle el PDF «Guía rápida para constructoras de vivienda».]
#casilla[Clave del cliente por canal privado, con el pedido de cambiarla al entrar.]

== La reunión, minuto a minuto
#table(
  columns: (auto, 1fr, auto),
  table.header([Min.], [Qué hacer (él maneja; usted guía)], [Momento que busca]),
  [0–3], [Entra con su usuario. Inicio: qué trae la cuenta.], [«Ya viene armado para mí»],
  [3–10], [Materiales y Mano de obra: escribe *sus* precios de cemento, varilla, bloque, arena, ripio y jornales. Mirar juntos el aviso de impacto.], [«Cambio un precio y todo se actualiza»],
  [10–18], [Ofertas › crea la de su obra real › Poner cliente › Añadir bloque › obra gris y acabados con *sus* m².], [«Una casa en un minuto»],
  [18–23], [Indirectos y utilidad: sus porcentajes y «Usar estos porcentajes en las ofertas nuevas». Comparar su precio por m² con el que cobra hoy.], [«Este es mi precio»],
  [23–27], [Exportar a Excel y abrir el archivo.], [«Lo mando al cliente o al banco»],
  [27–30], [Acordar la siguiente obra que cotizará con el sistema y la fecha del seguimiento.], [Compromiso de uso],
)

#nota(titulo: "CLAVE")[Que *él* maneje el teclado. Si usted hace clic por él, sale de la reunión sabiendo que el sistema funciona, pero no sabiendo usarlo.]

== Si pregunta…
- *«¿El precio por m² es exacto?»* Es el de sus APUs con sus precios: tan bueno como los precios y rendimientos que cargue. Los APUs de referencia se ajustan (doble clic en la descripción del rubro).
- *«¿Puedo traer mis presupuestos de Excel?»* Sí, con «Importar libro de Excel». Si el formato es distinto, lo revisamos con el equipo técnico antes de prometer nada.
- *«¿Cuánto cuesta después de la prueba?»* Plan Inicial: hasta 3 usuarios, en la nube de Turingtech. Precio vigente en el folleto comercial.

#nota(titulo: "NO PROMETER", color: rojo, fondo-color: rojo-suave)[
  - Precios en línea de ferreterías ni recomendaciones automáticas de dónde comprar: no existe todavía.
  - Cronograma de obra, control de avance, compras o bodega: Turing APU hace presupuestos.
  - Un PDF de presupuesto para el cliente final: hoy se entrega en Excel.
  - Desarrollos a medida sin pasar por el equipo técnico.
]

== Después de la reunión
#casilla[Cada día, el grupo de Telegram de leads avisa cuando entra y, a las 19:00, resume lo que hizo. Si lleva 3 días sin entrar, escribirle ese mismo día.]
#casilla[Día 3: «¿Ya cotizó la obra que acordamos? ¿Dónde se trabó?» Anotar lo que diga.]
#casilla[Día 15: revisar en Inicio el panel de valor (ofertas, bloques usados, horas ahorradas) y comentárselo.]
#casilla[Un mes antes de que venza la prueba: reunión corta con sus números y propuesta de plan.]
#casilla[Todo lo que no entendió o le faltó, al equipo técnico: es la lista de mejoras de facilidad de uso.]
