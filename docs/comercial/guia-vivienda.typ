// Guía rápida de Turing APU para constructoras de vivienda (vista sencilla). Se entrega al cliente.
// Capturas: copia local con la biblioteca de vivienda, usuario y empresa de ejemplo (datos ficticios).
// Compilar desde la raíz del repo:
//   typst compile --root docs/comercial docs/comercial/guia-vivienda.typ

#import "comun-guias.typ": *

#show: guia.with("Guía rápida · Turing APU para vivienda", [Turing APU · Guía rápida para constructoras de vivienda])

// ---------------------------------------------------------------- Portada
#block(width: 100%, fill: navy, inset: (x: 22pt, y: 26pt), radius: 10pt)[
  #logo(alto: 16pt, oscuro: true)
  #v(18pt)
  #text(size: 26pt, weight: "bold", fill: white)[Cotice una casa en minutos, \ con sus precios]
  #v(8pt)
  #text(size: 12pt, fill: rgb("#CBD5E1"))[Guía rápida para constructoras de vivienda: de los m² del cliente a un presupuesto con APUs, listo en Excel.]
]

#v(10pt)
== Lo que ya trae su cuenta

Su cuenta viene preparada para vivienda. No empieza en blanco:

#table(
  columns: (auto, 1fr),
  table.header([Qué], [Para qué le sirve]),
  [*Bloques*], [Obra gris (hormigón armado o estructura metálica), acabados Standard, Comfort y Premium, cerramiento, pérgola y cubierta de teja. Cada uno trae todos sus rubros y se ajusta a los m² de la obra.],
  [*APUs*], [38 análisis de precios unitarios de vivienda: excavación, hormigones, acero, mampostería, enlucidos, pisos, pintura, puertas, ventanas, piezas sanitarias y más.],
  [*Listas de precios*], [Materiales, mano de obra, equipos y transporte con *precios de referencia*. Cámbielos por los suyos (paso 1).],
  [*Indirectos*], [Gastos generales 12 %, imprevistos 3 % y utilidad 10 %. Cada oferta nueva nace con ellos y usted los cambia cuando quiera.],
  [*Oferta de ejemplo*], [«Vivienda ilustrativa de 100 m² en obra gris», para practicar sin miedo.],
)

#nota(titulo: "IMPORTANTE")[Los precios que trae son de referencia y no son los de su empresa. Antes de enviar su primera cotización, ponga sus precios (paso 1). Le toma unos 20 minutos y desde ahí todo se calcula con ellos.]

== Entrar por primera vez

+ Abra la dirección que le enviamos y escriba su usuario y su clave.
+ Cambie la clave: menú #boton[Usuarios], botón #boton[Editar] en su fila, «Nueva clave» y #boton[Guardar].
+ En #boton[Inicio] tiene las *misiones guiadas*: cinco tareas cortas, paso a paso, sobre la oferta de ejemplo. Son la forma más rápida de aprender.

#pagebreak()
// ---------------------------------------------------------------- Pasos
= Su primera cotización en seis pasos

#paso("1", "Ponga sus precios", "todas sus cotizaciones salen con los precios de sus proveedores.")

Menú #boton[Materiales]. Haga clic en el precio (columna P.U.), escriba el nuevo, por ejemplo `8,90`, y pulse *Enter*. Haga lo mismo en #boton[Mano de obra] con sus jornales por hora.

#captura("assets/vivienda-materiales.png", pie: [El cemento pasa de \$ 8,40 a \$ 8,90: el aviso dice a cuántos APUs y rubros afectó y cuánto cambió la oferta.], ancho: 78%)

Cada cambio se recalcula solo en todos los APUs y ofertas que usan ese material. Si se equivocó, pulse #boton[Deshacer] en el mismo aviso. Empiece por los que más pesan: *cemento, varilla, bloque, arena, ripio* y los jornales.

#paso("2", "Cree la oferta y póngale cliente", "una oferta por obra, con el nombre de su cliente.")

Menú #boton[Ofertas], escriba el nombre (por ejemplo «Casa Familia Torres 150 m²») y pulse #boton[Crear oferta]. Ya dentro, pulse #boton[Poner cliente], escriba el nombre y #boton[Guardar]. Ese nombre sale en el Excel.

#paso("3", "Añada bloques para los m² de la casa", "la casa completa en un minuto, sin copiar rubros a mano.")

Pulse #boton[Añadir bloque]. En la fila de la obra gris, cambie *¿Para cuántos?* a los m² de la casa (150) y pulse #boton[Añadir]. Todas las cantidades se ajustan a 150 m². Haga lo mismo con los acabados.

#captura("assets/vivienda-anadir-bloque.png", pie: [Cada bloque muestra su precio por m² con los indirectos de la oferta y el total para el tamaño que escribe.], ancho: 78%)

#paso("4", "Revise y ajuste", "el presupuesto refleja la obra real.")

Cada bloque entra como un capítulo con todos sus rubros. Para cambiar una cantidad, haga clic en la celda, escriba y pulse *Enter*: la celda queda en amarillo y el total de abajo se actualiza al instante. Para quitar un rubro, selecciónelo y pulse *Supr*. Para revisar un APU, haga doble clic en la descripción.

#captura("assets/vivienda-oferta.png", pie: [Casa de 150 m²: obra gris y acabados Standard. Abajo, el subtotal, el IVA y el total de la oferta.], ancho: 78%)

#paso("5", "Indirectos y utilidad", "su ganancia queda en cada precio unitario.")

Pestaña #boton[Indirectos y utilidad]. Escriba sus porcentajes y pulse *Enter*. Si quiere que todas las ofertas nuevas nazcan con estos valores, pulse #boton[Usar estos porcentajes en las ofertas nuevas].

#captura("assets/vivienda-indirectos.png", ancho: 66%)

#paso("6", "Exporte a Excel", "lo envía al cliente o al banco en minutos.")

Pulse #boton[Exportar a Excel], arriba a la derecha de la oferta. Descarga un libro con el presupuesto y cada APU, con fórmulas, que se abre en Excel. Exportar funciona siempre, aun si su licencia venció.

// ---------------------------------------------------------------- Más
#v(10pt)
= Para sacarle más provecho

== Arme sus propios bloques
¿Tiene una casa tipo, un baño estándar o una cocina que repite? Ármelo una vez como capítulo en una oferta, pulse #boton[Guardar como bloque], póngale nombre y, si quiere, el tamaño (por ejemplo «Para 1 u» o «Para 100 m²»). La próxima vez lo añade con un clic y la cantidad que necesite.

#captura("assets/vivienda-bloques.png", pie: [Menú Bloques: todos sus bloques, su costo directo y su costo por m².], ancho: 72%)

== Si cambia un precio a mitad de la cotización
Cámbielo en la lista (paso 1). La oferta se recalcula sola y el aviso le dice cuánto cambió el total. No tiene que revisar rubro por rubro.

== Preguntas frecuentes

*¿Pierdo algo si me equivoco?* No. Los cambios de precio se deshacen desde el aviso y cada cambio queda registrado.

*¿Puedo usar mis presupuestos de Excel?* Sí. En #boton[Ofertas] use #boton[Importar libro de Excel]. Si su libro tiene otro formato, escríbanos y lo revisamos con usted.

*¿Sirve en el celular?* Sí, el menú se abre con el botón de arriba a la izquierda. Para armar presupuestos largos es más cómodo en computadora.

*¿Quién me ayuda?* Su contacto de Turingtech, por WhatsApp. Si algo no se entiende, avísenos: lo mejoramos.

#v(8pt)
#nota(titulo: "SU PRIMERA SEMANA", color: verde, fondo-color: verde-suave)[
  #casilla[Cambié mi clave.]
  #casilla[Puse mis precios de cemento, varilla, bloque, arena, ripio y jornales.]
  #casilla[Revisé mis porcentajes de indirectos y utilidad.]
  #casilla[Hice la cotización de una obra real y la exporté a Excel.]
  #casilla[Guardé como bloque algo que repito en mis obras.]
]
