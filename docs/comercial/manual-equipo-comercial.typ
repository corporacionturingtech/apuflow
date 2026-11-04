// Manual del equipo comercial de Turing APU — uso exclusivo interno, NO es material para el cliente.
//
// Une todo el recorrido comercial: qué es el producto, a quién venderle, cómo descubrir, la demo
// de 10 minutos, precios, objeciones, del primer contacto a la firma y lo que nunca se promete.
// El folleto (folleto-turing-apu.typ) es lo que se entrega al cliente; la presentación
// (presentacion-turing-apu.html) es lo que se le muestra en la reunión.
//
// Fuentes de los datos (no prometer nada que no esté ahí): docs/BACKLOG.md (cifras medidas),
// docs/DECISIONES.md (D2 instancia propia, D6 licencia sin internet y exportar siempre),
// docs/arquitectura.md (gracia de 15 días, respaldos de 14 días) y la lámina de precios de
// presentacion-turing-apu.html. Si un precio cambia, se cambia en los tres documentos.
//
// Compilar desde la raíz del repo:
//   typst compile --root docs/comercial docs/comercial/manual-equipo-comercial.typ

// ---------- Marca de Turing APU (misma paleta que la app y la presentación) ----------
#let navy = rgb("#0F172A")
#let navy-2 = rgb("#1E293B")
#let naranja = rgb("#EA580C")
#let naranja-osc = rgb("#C2410C")
#let naranja-suave = rgb("#FFF1E8")
#let verde = rgb("#15803D")
#let verde-suave = rgb("#ECFDF3")
#let rojo = rgb("#B91C1C")
#let rojo-suave = rgb("#FEF2F2")
#let ambar = rgb("#B45309")
#let ambar-suave = rgb("#FFF7E6")
#let tinta = rgb("#0F172A")
#let gris = rgb("#64748B")
#let linea = rgb("#E2E8F0")
#let fondo = rgb("#F6F7F9")

#set document(title: "Manual del equipo comercial · Turing APU", author: "Corporación Turingtech S.A.S.")

#set page(
  paper: "a4",
  margin: (x: 20mm, top: 20mm, bottom: 22mm),
  footer: context {
    let caps = query(selector(heading.where(level: 1)).before(here()))
    set text(size: 8pt, fill: gris)
    line(length: 100%, stroke: 0.5pt + linea)
    v(-4pt)
    grid(
      columns: (1fr, auto),
      [Manual del equipo comercial · Turing APU · Uso interno#if caps.len() > 0 [ · #caps.last().body]],
      [#counter(page).display()],
    )
  },
)

#set text(font: ("Inter", "Arial"), size: 10.5pt, fill: tinta, lang: "es", number-type: "lining")
#set par(leading: 0.68em, justify: false, spacing: 0.95em)
#set list(indent: 4pt, body-indent: 6pt, spacing: 0.7em, marker: text(fill: naranja)[•])
#set enum(indent: 4pt, body-indent: 6pt, spacing: 0.7em)
#set heading(numbering: "1.")
#set table(stroke: 0.5pt + linea, inset: 7pt)
#show table.cell.where(y: 0): set text(weight: "bold", fill: navy, size: 9.5pt)
#show table.cell.where(y: 0): set table.cell(fill: fondo)

#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  block(width: 100%, above: 0pt, below: 16pt)[
    #text(size: 9pt, weight: "bold", fill: naranja-osc, tracking: 1.5pt)[CAPÍTULO #counter(heading).display("1")]
    #v(4pt)
    #text(size: 25pt, weight: "bold", fill: tinta)[#it.body]
    #v(6pt)
    #line(length: 22mm, stroke: 3pt + naranja)
  ]
}
#show heading.where(level: 2): it => block(width: 100%, above: 18pt, below: 8pt, sticky: true)[
  #text(size: 13.5pt, weight: "bold", fill: navy)[#it.body]
]

// =====================================================================
// COMPONENTES
// =====================================================================

#let icono(nombre, size: 14pt) = box(baseline: 20%, image("assets/icons/" + nombre + ".svg", width: size))

// Logo: isotipo + «TURING» + «APU» en naranja, como LogoTuringApu.tsx.
#let logo(alto: 14pt, oscuro: false) = box(baseline: 15%)[
  #box(baseline: 12%, image(if oscuro { "assets/turing-apu-isotipo-oscuro.png" } else { "assets/turing-apu-isotipo-claro.png" }, height: alto))
  #h(0.5em)
  #text(size: alto, weight: "bold", fill: if oscuro { white } else { navy }, tracking: 0.04em)[TURING #text(fill: naranja)[APU]]
]

// Frase para decir tal cual
#let frase(txt, titulo: "FRASE PARA DECIR") = block(
  width: 100%, fill: fondo, inset: (x: 12pt, y: 10pt), radius: 6pt,
  stroke: (left: 3pt + naranja), above: 8pt, below: 10pt, breakable: false,
)[
  #text(size: 7.5pt, fill: naranja-osc, weight: "bold", tracking: 1pt)[#titulo]
  #v(2pt)
  #text(style: "italic")[#txt]
]

// Plantilla de WhatsApp (globo de chat)
#let whatsapp(txt, titulo: "MENSAJE DE WHATSAPP") = block(
  width: 100%, fill: rgb(231, 248, 238), inset: (x: 12pt, y: 10pt),
  radius: (top-left: 10pt, top-right: 10pt, bottom-right: 10pt, bottom-left: 2pt),
  above: 8pt, below: 10pt, breakable: false,
)[
  #text(size: 7.5pt, fill: verde, weight: "bold", tracking: 1pt)[#titulo]
  #v(2pt)
  #txt
]

// Idea importante
#let clave(txt, titulo: "CLAVE") = block(
  width: 100%, fill: ambar-suave, inset: (x: 12pt, y: 10pt), radius: 6pt,
  stroke: (left: 3pt + ambar), above: 8pt, below: 10pt, breakable: false,
)[
  #text(size: 7.5pt, fill: ambar, weight: "bold", tracking: 1pt)[#titulo]
  #v(2pt)
  #txt
]

// Límite honesto: lo que no hay que prometer
#let limite(txt) = block(
  width: 100%, fill: rojo-suave, inset: (x: 10pt, y: 8pt), radius: 6pt,
  above: 6pt, below: 4pt, breakable: false,
)[
  #text(size: 7.5pt, fill: rojo, weight: "bold", tracking: 1pt)[NO PROMETAS]
  #h(4pt)
  #text(size: 9.5pt)[#txt]
]

// Captura de la app con marco de ventana
#let captura(ruta, pie: none) = block(width: 100%, above: 6pt, below: 10pt, breakable: false)[
  #block(width: 100%, clip: true, radius: 7pt, stroke: 0.6pt + linea, fill: white)[
    #block(width: 100%, fill: fondo, inset: (x: 8pt, y: 5pt), below: 0pt)[
      #for c in (rgb("#F87171"), rgb("#FBBF24"), rgb("#34D399")) { box(circle(radius: 2.6pt, fill: c)); h(3pt) }
    ]
    #image(ruta, width: 100%)
  ]
  #if pie != none { align(center, text(size: 8.5pt, fill: gris, style: "italic")[#pie]) }
]

// Cifra grande con etiqueta
#let dato(cifra, etiqueta, color: naranja-osc) = block(
  width: 100%, fill: fondo, inset: 10pt, radius: 8pt, breakable: false,
)[
  #text(size: 19pt, weight: "bold", fill: color)[#cifra]
  #v(-2pt)
  #text(size: 9pt, fill: gris)[#etiqueta]
]

// Chip
#let chip(txt, color: naranja-osc) = box(fill: color.lighten(88%), inset: (x: 6pt, y: 3pt), radius: 8pt)[
  #text(fill: color, size: 8.5pt, weight: "bold")[#txt]
]

// Objeción + respuesta
#let objecion(n, pregunta, respuesta, idea: none) = block(
  width: 100%, stroke: 0.6pt + linea, inset: 12pt, radius: 8pt, above: 8pt, below: 8pt, breakable: false,
)[
  #grid(
    columns: (auto, 1fr), column-gutter: 8pt, align: horizon,
    box(fill: rojo.lighten(88%), inset: (x: 6pt, y: 3pt), radius: 4pt)[#text(size: 8.5pt, weight: "bold", fill: rojo)[#n]],
    text(weight: "bold", size: 11pt)[«#pregunta»],
  )
  #v(4pt)
  #if idea != none [#text(size: 9.5pt, fill: gris)[*Qué hay detrás:* #idea] #v(2pt)]
  #text(weight: "bold", fill: verde)[Tú respondes: ]#respuesta
]

// Casilla para marcar a mano
#let casilla(txt) = block(above: 7pt, below: 7pt, breakable: false)[
  #grid(columns: (16pt, 1fr), box(width: 10pt, height: 10pt, stroke: 1pt + gris, radius: 2pt, baseline: 1pt), txt)
]

// Paso numerado
#let paso(n, titulo, meta) = block(width: 100%, above: 6pt, below: 10pt, breakable: false)[
  #grid(
    columns: (30pt, 1fr), column-gutter: 10pt, align: horizon,
    box(width: 30pt, height: 30pt, fill: naranja, radius: 15pt)[#align(center + horizon)[#text(fill: white, weight: "bold", size: 13pt)[#n]]],
    [#text(size: 14pt, weight: "bold")[#titulo] \ #text(size: 9.5pt, fill: verde, weight: "bold")[Avanzaste cuando: ]#text(size: 9.5pt)[#meta]],
  )
]

// Tarjeta de plan
#let plan(nombre, para, precio, anual, items, impl, destacado: false) = block(
  width: 100%, height: 100%, inset: 12pt, radius: 8pt, breakable: false,
  fill: if destacado { navy } else { white },
  stroke: if destacado { 1.5pt + naranja } else { 0.8pt + linea },
)[
  #let t = if destacado { white } else { tinta }
  #let s = if destacado { rgb("#CBD5E1") } else { gris }
  #text(size: 13pt, weight: "bold", fill: t)[#nombre]
  #if destacado { h(4pt); box(fill: naranja, inset: (x: 5pt, y: 2.5pt), radius: 8pt, text(size: 7pt, weight: "bold", fill: white)[RECOMENDADO]) }
  \ #text(size: 8.5pt, fill: s)[#para]
  #v(6pt)
  #text(size: 22pt, weight: "bold", fill: if destacado { naranja } else { naranja-osc })[#precio]
  \ #text(size: 8.5pt, fill: s)[#anual]
  #v(4pt)
  #line(length: 100%, stroke: 0.5pt + if destacado { rgb("#334155") } else { linea })
  #set text(size: 9.5pt, fill: t)
  #for i in items [#box(icono(if destacado { "check-blanco" } else { "check" }, size: 9pt)) #i \ ]
  #v(2pt)
  #text(size: 8.5pt, weight: "bold", fill: if destacado { rgb("#FDBA74") } else { naranja-osc })[#impl]
]

#let tabla(..args) = block(width: 100%, breakable: false, table(..args))

// =====================================================================
// PORTADA
// =====================================================================

#page(fill: navy, margin: 0pt, footer: none)[
  #place(top + right, dx: 40mm, dy: -40mm, circle(radius: 75mm, fill: navy-2))
  #place(top + right, dx: 25mm, dy: 95mm, circle(radius: 28mm, fill: naranja.transparentize(20%)))
  #place(bottom + left, dx: -30mm, dy: 30mm, circle(radius: 55mm, fill: navy-2.transparentize(30%)))
  #pad(x: 22mm, top: 28mm)[
    #logo(alto: 28pt, oscuro: true)
    #v(70mm)
    #text(size: 10pt, fill: rgb("#FB923C"), weight: "bold", tracking: 2pt)[USO INTERNO · EQUIPO COMERCIAL]
    #v(6pt)
    #text(size: 40pt, weight: "bold", fill: white)[Manual del\ equipo comercial]
    #v(10pt)
    #block(width: 135mm)[
      #text(size: 14pt, fill: rgb("#CBD5E1"))[Todo lo que necesitas para que cada empresa que cotiza con APUs en Excel
      vea su propio total cuadrar en Turing APU, y quiera quedarse.]
    ]
    #v(16mm)
    #grid(
      columns: (auto, auto, auto), column-gutter: 8pt,
      ..("Conocer el producto", "Hacer la demo", "Cerrar la venta").map(t => box(
        stroke: 0.8pt + white.transparentize(50%), inset: (x: 10pt, y: 6pt), radius: 12pt,
      )[#text(fill: white, size: 9.5pt, weight: "medium")[#t]]),
    )
  ]
  #place(bottom + left, dx: 22mm, dy: -16mm)[
    #text(size: 8.5pt, fill: rgb("#94A3B8"))[Corporación Turingtech S.A.S. · Noviembre 2026 · No entregar al cliente]
  ]
]

// =====================================================================
// CÓMO USAR EL MANUAL + ÍNDICE
// =====================================================================

#grid(
  columns: (1fr, 1fr), column-gutter: 16pt,
  [
    #text(size: 20pt, weight: "bold")[Antes de empezar]
    #v(6pt)
    Este manual es tu entrenamiento. Léelo completo una vez, con calma, y vuelve a él antes de
    cada etapa importante: tu primera llamada, tu primera demo, tu primer cierre.

    No necesitas saber de construcción. Necesitas entender *qué le duele* a quien presupuesta y
    *qué momento del producto* se lo quita. Aquí está el porqué de cada cosa, para que respondas
    con tus palabras y no de memoria.

    #v(4pt)
    #text(size: 9pt, weight: "bold", fill: gris, tracking: 1pt)[CÓMO LEERLO]
    #frase([Lo que está en estas cajas lo puedes decir tal cual.], titulo: "ASÍ SE VEN LAS FRASES")
    #whatsapp([Plantillas para copiar y enviar por WhatsApp o correo.], titulo: "ASÍ SE VEN LOS MENSAJES")
    #clave([Ideas que hacen la diferencia entre una demo bonita y una venta.])
    #limite([Lo que el producto no hace. Nunca lo prometas.])
  ],
  [
    #text(size: 20pt, weight: "bold")[Contenido]
    #v(6pt)
    #outline(title: none, depth: 1, indent: 0pt)
    #v(10pt)
    #block(fill: fondo, inset: 12pt, radius: 8pt)[
      #set text(size: 9pt, fill: gris)
      *Datos de este manual.* Las cifras medidas salen de las pruebas del producto; los precios, de la
      lámina de precios de la presentación. Si algo cambia, avisa al equipo para actualizar el manual,
      el folleto y la presentación a la vez.
    ]
  ],
)

// =====================================================================
= La meta: que coticen en Turing APU
// =====================================================================

== No vendemos un programa. Vendemos ofertas más rápidas y más ganadas

Una empresa puede decir «qué bonito» en la demo y seguir cotizando en Excel. Esa venta no sirve.
Nuestra meta es otra: *que su próxima oferta real salga de Turing APU*. Cuando eso pasa, el
presupuestador ya no quiere volver a revisar APU por APU, y pagar se vuelve obvio.

#clave([*Empresa que cotiza en Turing APU es empresa que paga.* Tu trabajo no termina cuando dicen «sí»:
termina cuando envían su primera oferta desde el sistema.], titulo: "LA REGLA QUE RESUME TODO")

== El recorrido de una empresa

Cada empresa pasa por seis etapas. En cada una sabes exactamente qué cuenta como avance.

#let etapas = (
  ("1", "Contacto", "Aceptan 20 minutos de llamada."),
  ("2", "Descubrimiento", "Te dan sus números y te envían un libro de Excel."),
  ("3", "Demo con su libro", "Vieron su total cuadrar y aceptan el piloto."),
  ("4", "Piloto de 14 días", "Arman una oferta real en Turing APU."),
  ("5", "Firma", "Plan, usuarios e implementación aprobados."),
  ("6", "Cotizando", "Su primera oferta sale del sistema."),
)
#for (i, e) in etapas.enumerate() {
  let col = if i < 3 { navy.lighten(i * 18%) } else { naranja.darken((5 - i) * 8%) }
  block(width: 100% - i * 8pt, inset: (x: 10pt, y: 5pt), radius: 4pt, fill: col, above: 2pt, below: 2pt, breakable: false)[
    #grid(columns: (14pt, 1.15fr, 2fr), align: horizon,
      text(fill: white, weight: "bold", size: 11pt)[#e.at(0)],
      text(fill: white, weight: "bold", size: 10pt)[#e.at(1)],
      text(fill: white, size: 9pt)[#e.at(2)])
  ]
}
#v(4pt)
La etapa más importante es la *3*. Si el cliente ve su propio total cuadrar al centavo, casi todo lo
demás se da solo. Si no lo ve, ningún descuento ni ninguna frase la va a salvar.

== Las 7 reglas de oro

#grid(
  columns: (1fr, 1fr), column-gutter: 16pt, row-gutter: 8pt,
  ..(
    ("Pregunta antes de mostrar.", "Muestra solo lo que le duele. Tres momentos valen más que veinte funciones."),
    ("Pide siempre su libro.", "Su Excel cuadrando en el sistema vende más que cualquier diapositiva."),
    ("Prueba antes de mostrar.", "Sube tú el libro antes de la demo. Nunca descubras en vivo que no cuadra."),
    ("El presupuestador es la clave.", "El gerente firma; el presupuestador decide si el sistema se usa."),
    ("Habla con sus números.", "Sus horas, sus ofertas, su costo por hora. No los nuestros."),
    ("No prometas lo que no está.", "Si no sabes, «lo confirmo con el equipo» y lo confirmas."),
    ("Cada etapa termina con una fecha.", "«Me gustó» no es avance. «Empezamos el lunes», sí."),
  ).enumerate().map(((i, r)) => grid(
    columns: (22pt, 1fr),
    text(size: 17pt, weight: "bold", fill: naranja)[#(i + 1)],
    [#text(weight: "bold")[#r.at(0)] \ #text(size: 9.5pt, fill: gris)[#r.at(1)]],
  )),
)

// =====================================================================
= Turing APU en una página
// =====================================================================

Turing APU es el sistema web de Corporación Turingtech para armar presupuestos de obra con APUs
(análisis de precios unitarios). Reemplaza el libro de Excel con el que hoy cotizan las constructoras
y los contratistas, pero *se siente como ese Excel*: lee su libro, cuadra al centavo y, al final, lo
devuelve en su mismo formato.

#frase([Cotice en horas lo que hoy le toma días, y llegue al precio que gana la oferta.], titulo: "LA FRASE QUE REPITES")

#captura("assets/app-oferta.png", pie: [La oferta en Turing APU: capítulos, rubros, peso de cada rubro y total, como en su Excel.])

== Las tres cosas que nos hacen distintos

#grid(
  columns: (1fr, 1fr, 1fr), column-gutter: 8pt,
  ..(
    ("excel", "Cuadra con su Excel", "Sube su libro y ve el mismo total, al centavo. Si algo no cuadra, le dice en qué rubro."),
    ("equipo", "Todos a la vez", "Civil, Eléctrico y Mecánico en la misma oferta, viendo dónde está cada uno."),
    ("impacto", "Panel de impacto", "Cambia el precio del cobre y ve cuántos APUs y rubros se movieron, y cuánto subió la oferta."),
  ).map(((ic, t, d)) => block(width: 100%, stroke: 0.6pt + linea, radius: 8pt, inset: 10pt)[
    #box(fill: naranja-suave, inset: 6pt, radius: 6pt)[#icono(ic, size: 15pt)]
    #v(4pt)
    #text(weight: "bold", size: 11pt)[#t] \
    #text(size: 9.5pt, fill: gris)[#d]
  ]),
)

Además: bloques de rubros (una bahía completa en un clic), costo objetivo para llegar al presupuesto
referencial, historial de quién cambió qué, versiones de la oferta, exportar a Excel siempre, y la opción
de vivir en nuestra nube o en el servidor del cliente.

== Cifras que sí puedes decir, porque están medidas

#grid(
  columns: (1fr, 1fr, 1fr), column-gutter: 8pt,
  dato("84 ms", "para recalcular una oferta de 5.000 rubros"),
  dato("$ 0,00", "de diferencia con el total de su Excel"),
  dato("15 días", "de gracia si vence la licencia; exportar nunca se bloquea"),
)
#limite([Las demás cifras de las pantallas de ejemplo («+\$ 1.240,00», «18 ms», totales) son ejemplos. Se dicen como ejemplos.])

// =====================================================================
= Conoce a tu cliente
// =====================================================================

== A quién le vendemos

Empresas de Ecuador (y Perú) que cotizan obras con APUs en Excel y tienen *entre 2 y 30 personas que
presupuestan*.

#tabla(
  columns: (auto, 1fr, auto),
  table.header([Tipo de empresa], [Lo que le duele], [Plan]),
  [*Contratista eléctrico* \ #text(size: 9pt, fill: gris)[subestaciones, líneas, redes]], [Ofertas de cientos o miles de rubros, bahías que se repiten y cobre que cambia de precio cada semana.], [#chip("Equipo")],
  [*Constructora civil mediana*], [Licita en SERCOP con presupuesto referencial y cada oferta exige CPC y VAE por rubro.], [#chip("Equipo")],
  [*Contratista mecánico*], [Estructura metálica y montaje por peso, casi siempre con otras disciplinas en la misma oferta.], [#chip("Inicial o Equipo")],
  [*Consultora de presupuestos*], [Arma referenciales para entidades; vive de hacerlo rápido y sin errores.], [#chip("Inicial")],
  [*Empresa con servidor propio*], [Política de datos estricta o área de sistemas que no acepta nube.], [#chip("Empresa")],
)

#grid(
  columns: (1fr, 1fr), column-gutter: 14pt,
  [
    *Señales de buen prospecto*
    - Preparan dos o más ofertas al mes.
    - Trabajan dos o más disciplinas en una oferta.
    - Licitan en SERCOP o les dan un referencial.
    - Perdieron hace poco una oferta por precio o por un error.
    - Están contratando otro presupuestador.
  ],
  [
    *Cuándo no gastar tiempo*
    - Una persona que cotiza una obra al año.
    - Alguien que solo quiere llenar un formulario de SERCOP.
    - Quien busca contabilidad, compras, planillas o control de obra: Turing APU hace presupuestos, y
      los hace muy bien. No es un ERP.
  ],
)

== Quién decide y quién usa

#tabla(
  columns: (auto, 1fr, 1fr),
  table.header([Quién], [Qué le importa], [Qué le muestras]),
  [*Gerente o dueño* \ #text(size: 9pt, fill: gris)[decide y paga]], [Ganar más ofertas, no perder margen, saber qué se envió.], [Costo objetivo, panel de valor y el cálculo de ahorro.],
  [*Jefe de presupuestos* \ #text(size: 9pt, fill: gris)[usa el sistema]], [Que cuadre, que no sea más lento que Excel, no perder su trabajo.], [Cuadra con su Excel, tabla que se maneja como Excel, bloques, impacto.],
  [*Sistemas (TI)* \ #text(size: 9pt, fill: gris)[puede frenar]], [Dónde quedan los datos, seguridad, instalación.], [Nube con HTTPS y respaldo diario, o su servidor con licencia sin internet.],
  [*Contador* \ #text(size: 9pt, fill: gris)[puede frenar]], [Costo, factura, permanencia.], [Dólares más IVA, sin permanencia, pago anual con 2 meses gratis.],
)

#clave([El presupuestador es quien más miedo tiene a que el sistema lo reemplace. Dile la verdad: Turing APU
le quita lo que no le gusta (copiar rubros, revisar fórmulas, buscar APU por APU), no su criterio. Si él
sale contento de la demo, la venta avanza sola.], titulo: "CUIDA AL PRESUPUESTADOR")

== Lo que te van a decir

#tabla(
  columns: (1.2fr, 1fr, auto),
  table.header([Si te dice algo como…], [Lo que de verdad le duele], [Muestra esto]),
  [«Si cambia el cobre, hay que revisar todo.»], [Horas buscando APU por APU, y errores.], [Panel de impacto],
  [«No podemos trabajar dos en el mismo archivo.»], [La oferta se arma en fila.], [Equipo a la vez],
  [«El cliente nos dio un presupuesto referencial.»], [No saben dónde recortar.], [Costo objetivo],
  [«¿Cuál fue la versión que se envió?»], [Carpetas con FINAL\_v2\_ahora\_si.xlsx.], [Versiones e historial],
  [«Cada bahía la armamos copiando de otra oferta.»], [Copiar y pegar 40 rubros.], [Bloques],
  [«Una fórmula mal arrastrada nos costó plata.»], [No confían en el total.], [Cuadra al centavo],
  [«El cliente quiere el Excel.»], [Miedo a cambiar y a quedar atados.], [Exportar a Excel],
)

// =====================================================================
= Preguntas para descubrir
// =====================================================================

Antes de mostrar nada, pregunta. Una buena llamada dura 20 minutos y el cliente habla más que tú.
*Anota los números*: los vas a usar en el cálculo de ahorro y en la propuesta.

#frase([Ingeniero, antes de mostrarle nada: ¿cómo arman hoy una oferta? ¿Qué es lo que más tiempo les quita?])

#tabla(
  columns: (auto, 1.3fr, 1fr),
  table.header([], [Pregunta], [Para qué te sirve]),
  [1], [¿Cuántas ofertas preparan al mes?], [Volumen. Con menos de una al mes, no es el momento.],
  [2], [¿Cuántos rubros tiene una oferta típica?], [Con más de 300, el impacto y los bloques son indispensables.],
  [3], [¿Cuántas horas o días les toma una oferta?], [La base del cálculo de ahorro.],
  [4], [¿Cuántas personas trabajan en una oferta, y de qué disciplinas?], [Define el plan: hasta 3 es Inicial; hasta 10, Equipo.],
  [5], [Cuando sube un material, ¿cómo actualizan los precios?], [Abre la puerta al panel de impacto.],
  [6], [Con un presupuesto referencial, ¿cómo deciden qué bajar?], [Abre la puerta al costo objetivo.],
  [7], [¿Licitan en SERCOP?], [Para mencionar CPC, VAE e IVA 15 %.],
  [8], [¿Tienen servidor propio o una política de datos?], [Nube o plan Empresa.],
  [9], [¿Quién más decide una compra como esta?], [Saber a quién falta convencer.],
  [10], [¿Cuándo es su próxima oferta grande?], [Urgencia: el piloto se arma con esa oferta.],
)

Termina siempre pidiendo el libro:

#frase([¿Me puede enviar el libro de una oferta que ya cerraron? Puede quitar el nombre del cliente. En la
demo lo subimos frente a usted y vemos que cuadre al centavo.])

// =====================================================================
= La demo de 10 minutos
// =====================================================================

== Antes de la reunión

#casilla[Sube tú el libro del cliente y comprueba que cuadre. Si no cuadra, revísalo con el equipo técnico.]
#casilla[Si no hay libro, usa la empresa demo: pantalla de Inicio, botón «Cargar empresa demo». Trae una oferta de subestación de ejemplo y 7 misiones guiadas para practicar.]
#casilla[Ten abierta la presentación (`presentacion-turing-apu.html`) por si hay que explicar algo con calma.]
#casilla[Confirma quién estará: idealmente el gerente *y* el presupuestador.]

#captura("assets/app-cuadra.png", pie: [El momento que más vende: su libro, su total, al centavo.])

== Minuto a minuto

#tabla(
  columns: (auto, 1fr, 1.3fr),
  table.header([Min.], [Qué haces], [Qué dices]),
  [0–2], [Subes su libro y llegas a la revisión.], [«Este es su libro, tal como lo tiene. Mire el total: el mismo, al centavo.» Calla y deja que lo mire.],
  [2–4], [Cambias el precio de un material que usen mucho.], [«Este precio estaba en estos APUs y estos rubros. La oferta subió esto. ¿Cuánto les toma hoy hacer este cambio?»],
  [4–5], [Pulsas Deshacer.], [«Y si fue un error, se deshace con un clic.»],
  [5–6], [Añades un bloque (una bahía, una malla).], [«Lo que repiten en cada oferta se guarda una vez y entra en un clic.»],
  [6–8], [Abres Costo objetivo con la meta del cliente.], [«Le dice cuánto le falta y qué rubros pesan más.»],
  [8–9], [Otra ventana con otro usuario, editas.], [«Así trabajan Civil y Eléctrico a la vez.»],
  [9–10], [Exportas a Excel.], [«Y su cliente recibe el Excel de siempre, con fórmulas.»],
)

#captura("assets/app-impacto.png", pie: [Panel de impacto: el cable 2/0 AWG pasó de \$ 9,60 a \$ 10,40 y el sistema dice qué afectó.])

#frase([¿Le parece si hacemos un piloto de 14 días con su próxima oferta, y usted decide con sus propios números?], titulo: "CIERRA LA DEMO CON UNA SOLA PREGUNTA")

#limite([No muestres configuración ni administración, no recorras todos los menús y no hables de servidores ni bases de datos salvo que pregunte alguien de sistemas.])

// =====================================================================
= Planes y precios
// =====================================================================

Todos los precios son en dólares, *más IVA*. Sin permanencia: si se va, se lleva su Excel.

#block(breakable: false)[
  #grid(
    columns: (1fr, 1fr, 1fr), rows: 6.9cm, column-gutter: 8pt,
    plan("Inicial", "Para quien empieza", [\$ 79 #text(size: 10pt, weight: "regular")[al mes]], "o $ 790 al año",
      ("Hasta 3 usuarios", "Nube de Turingtech", "Bloques, impacto y objetivo"), "Implementación: $ 350"),
    plan("Equipo", "Para varias disciplinas", [\$ 249 #text(size: 10pt, weight: "regular")[al mes]], "o $ 2.490 al año",
      ("Hasta 10 usuarios", "Tiempo real y presencia", "Roles por disciplina"), "Implementación: $ 900", destacado: true),
    plan("Empresa", "Para su propio servidor", [\$ 490 #text(size: 10pt, weight: "regular")[al mes]], "desde · facturación anual",
      ("Usuarios según contrato", "Su servidor o nube dedicada", "Soporte prioritario"), "Implementación: desde $ 1.800"),
  )
]

#clave([*Precio fundador:* las primeras 10 empresas pagan la implementación a la mitad y congelan la tarifa
12 meses. Es urgencia real: úsala, pero no digas que quedan pocos cupos si no es verdad. El socio lleva la
cuenta. *Pago anual:* 12 meses por el precio de 10.], titulo: "LO QUE CREA URGENCIA")

== Cómo presentarlos

+ *Nunca des el precio antes de la demo.* Primero el cliente ve su libro cuadrar; después, el precio se
  compara con lo que acaba de ver.
+ *Recomienda un plan con sus números* (pregunta 4). El plan Empresa lo cotiza siempre el socio.
+ *Haz la cuenta con el cliente*, con sus horas y su costo por hora:

#grid(
  columns: (1fr, auto, 1fr, auto, 1fr), column-gutter: 6pt, align: horizon,
  dato("10 h", "ahorradas al mes (ejemplo)", color: navy),
  text(size: 16pt, fill: gris)[×],
  dato("$ 12", "costo por hora", color: navy),
  text(size: 16pt, fill: gris)[=],
  dato("$ 120", "al mes, contra $ 79 del plan Inicial"),
)

Y el argumento que más pesa: *una sola oferta ganada paga años de licencia*. Una oferta de \$~250.000 con
8 % de margen deja \$~20.000: más de ocho años del plan Equipo anual (ejemplo; usa los números del cliente).

== Si te comparan con una licencia de escritorio

#block(breakable: false)[
Úsalo solo si sale la objeción del precio. El programa de APUs de escritorio más usado en Ecuador publica
unos *\$ 279 al año por equipo* (o \$ 505 a \$ 715 perpetua), más impuestos. Confírmalo antes de la reunión.

#tabla(
  columns: (auto, 1fr, 1fr),
  table.header([Usuarios], [Licencias de escritorio], [Turing APU, anual]),
  [3], [3 × \$ 279 = \$ 837], [Inicial: *\$ 790*],
  [10], [10 × \$ 279 = \$ 2.790], [Equipo: *\$ 2.490*],
)
Y con Turing APU trabajan todos a la vez, en la nube, con respaldo diario, panel de impacto y soporte.
]

== Qué puedes ceder y qué no

#tabla(
  columns: (1fr, 1fr, 1fr),
  table.header([#text(fill: verde)[Puedes ofrecerlo tú]], [#text(fill: ambar)[Antes, habla con el socio]], [#text(fill: rojo)[Nunca]]),
  [
    - Precio fundador, si hay cupo.
    - Pago anual (2 meses gratis).
    - Piloto de 14 días sin costo, con criterios de éxito por escrito.
  ],
  [
    - Más usuarios en un plan.
    - Descuentos en la implementación más allá del fundador.
    - Todo el plan Empresa.
    - Clientes que ya tienen una propuesta nuestra.
  ],
  [
    - Bajar la mensualidad publicada.
    - Prometer funciones o fechas de desarrollo.
    - Regalar la implementación: es trabajo real.
  ],
)

// =====================================================================
= Objeciones y cómo responderlas
// =====================================================================

Primero escucha la objeción entera. Después repítela con tus palabras («Si le entiendo bien, le
preocupa…») y solo entonces responde. Termina cada respuesta con una pregunta.

#objecion("1", "Excel nos funciona.", [«Y lo va a seguir usando: Turing APU lee su Excel y le devuelve el mismo libro. Lo que cambia es que ya no revisa a mano cada APU cuando sube un precio. ¿Cuántas horas se fueron en eso la última vez?»], idea: [miedo al cambio y a perder lo que ya funciona.])
#objecion("2", "Es caro.", [«¿Cuánto vale una hora de su presupuestador? Con 10 horas al mes, el plan Inicial ya se pagó. Y una oferta ganada paga años de licencia.» Si insiste, usa la tabla de licencias de escritorio.])
#objecion("3", "Ya usamos otro programa de APUs.", [«Entonces ya saben lo que vale tener los APUs ordenados. Lo que ese programa no les da es que tres disciplinas trabajen a la vez ni ver el impacto de un cambio de precio en toda la oferta. ¿Lo probamos con una oferta suya?» Nunca hables mal del otro programa.])
#objecion("4", "Nuestros precios son confidenciales. No queremos nube.", [«Por eso existe el plan Empresa: Turing APU se instala en su servidor y sus datos no salen de su empresa. Y en nuestra nube cada empresa tiene su propia instalación: sus datos no se mezclan con los de nadie, viajan cifrados y se respaldan cada día.»])
#objecion("5", "¿Y si dejamos de pagar, o Turingtech desaparece?", [«Sus datos son suyos. Exportar a Excel nunca se bloquea: si la licencia vence, tiene 15 días de gracia y después el sistema queda en solo lectura, pero puede ver y exportar todo. En su servidor, además, la licencia funciona sin internet.»], idea: [miedo a quedar atado a un proveedor.])
#objecion("6", "No tenemos tiempo para implementar.", [«Nosotros subimos sus libros y comprobamos que cuadren. Su equipo solo necesita una capacitación corta por rol, y la siguiente oferta ya la arman en Turing APU.»])
#objecion("7", "Los precios cambian todos los días.", [«Justamente para eso está: usted escribe el precio nuevo y todo se recalcula solo, mostrándole cuánto cambió la oferta. También puede subir la lista de su proveedor y ver el impacto antes de confirmar.»])
#objecion("8", "¿Sirve para SERCOP?", [«Sí: maneja IVA 15 %, y CPC, origen y VAE por rubro en ofertas públicas. Y exporta el Excel que usted ya presenta.»])
#objecion("9", "Somos pocos. Solo presupuesto yo.", [«El plan Inicial es para eso: hasta 3 usuarios por \$ 79 al mes. Los bloques y el impacto le ahorran horas aunque trabaje solo.»])
#objecion("10", "Tengo que pensarlo.", [«Claro. ¿Qué le falta ver para decidir?» Escucha. «¿Le parece si hacemos el piloto de 14 días con su próxima oferta y decide con datos? ¿Empezamos el [fecha]?»], idea: [casi siempre es una duda que no dijo. Encuéntrala.])
#objecion("11", "¿Hace contabilidad, compras, planillas o cronograma?", [La verdad: «Hoy no. Turing APU se dedica al presupuesto y lo hace muy bien. Anoto su pedido para el equipo.» Y se lo pasas al socio.])

// =====================================================================
= Del primer contacto a la firma
// =====================================================================

#paso("1", "Primer contacto", "hay fecha y hora para una llamada de 20 minutos.")
#whatsapp([Hola, [nombre]. Soy [tu nombre], de Corporación Turingtech. Hicimos Turing APU, un sistema para presupuestos con APUs que lee su Excel y lo cuadra al centavo. ¿Le puedo mostrar en 20 minutos cómo se actualiza toda una oferta cuando sube el cobre?], titulo: "PRIMER MENSAJE")

#paso("2", "Descubrimiento (20 min)", "te enviaron un libro y hay fecha de demo.")
#whatsapp([Gracias por su tiempo, [nombre]. Como quedamos, ¿me envía el libro de una oferta ya cerrada? Puede quitar el nombre del cliente. El [día] lo subimos en vivo y vemos que cuadre al centavo.], titulo: "DESPUÉS DEL DESCUBRIMIENTO")

#paso("3", "Demo con su libro (30 min)", "aceptó el piloto con fecha de inicio.")
#whatsapp([[nombre], hoy vio su libro cuadrar en Turing APU: \$ [total]. Le propongo el piloto de 14 días con su próxima oferta, sin costo. ¿Empezamos el [fecha]?], titulo: "DESPUÉS DE LA DEMO")

#paso("4", "Piloto de 14 días", "se cumplieron los criterios y hay reunión de cierre.")
#block(breakable: false)[
  *Criterios de éxito del piloto.* Se acuerdan por escrito el primer día, para que el cierre sea obvio:
  #casilla[Su libro cuadra al centavo en Turing APU.]
  #casilla[Arman una oferta real dentro del sistema.]
  #casilla[Comparan el tiempo con el de una oferta parecida hecha en Excel.]
  #casilla[Al menos dos personas trabajan a la vez en esa oferta.]
]
#whatsapp([[nombre], ¿cómo va la oferta de [obra]? Si quiere, la revisamos juntos y comparamos tiempos con la anterior.], titulo: "SI NO RESPONDE EN 3 DÍAS")

#paso("5", "Propuesta y firma", "firma u orden de compra.")
#whatsapp([Le adjunto la propuesta: plan Equipo, \$ 2.490 al año más IVA, e implementación a precio fundador de \$ 450. El precio fundador es solo para las primeras 10 empresas. ¿Firmamos esta semana para empezar la implementación el [fecha]?], titulo: "CON LA PROPUESTA")

#paso("6", "Implementación (días)", "envió su primera oferta desde Turing APU.")
Subimos sus libros, configuramos disciplinas, usuarios y bloques, y capacitamos a cada rol. Acompaña la
primera oferta: un cliente que cotiza bien su primera oferta es el que te recomienda.

#clave([Una etapa sin fecha comprometida no es un avance. «Me pareció muy bueno» no mueve la venta;
«empecemos el lunes» sí. Si en dos seguimientos no logras una fecha, pregunta con franqueza si sigue
siendo prioridad.], titulo: "REGLA DE AVANCE")

// =====================================================================
= Lo que nunca debes prometer
// =====================================================================

#limite([*Clientes por su nombre.* Nuestro primer cliente no es referencia pública mientras no lo autorice. Si preguntan: «Turing APU nació con una empresa de subestaciones eléctricas en Ecuador». Si un prospecto ya tiene una propuesta nuestra, habla antes con el socio.])
#limite([*Funciones que no existen*, integraciones con otros sistemas o fechas de desarrollo. Si piden algo, «lo anoto para el equipo» y se lo pasas al socio.])
#limite([*Cifras infladas.* Nada de «el más vendido» ni «muchos clientes». Las cifras de ejemplo se dicen como ejemplo.])
#limite([*Precios sin IVA como si fueran finales.* Siempre «más IVA».])
#limite([*Contabilidad, compras, planillas o control de obra.* Turing APU hace presupuestos.])
#limite([*Pedir contraseñas o datos personales.* El libro de muestra puede venir sin el nombre del cliente.])

#v(6pt)
#clave([*No hablamos mal de otro programa.* El rival real es el Excel, y tampoco lo atacamos: lo importamos y lo devolvemos.])

// =====================================================================
= Tu caja de herramientas
// =====================================================================

#tabla(
  columns: (auto, auto, 1fr),
  table.header([Material], [Para quién], [Cuándo se usa]),
  [Presentación \ `presentacion-turing-apu.html`], [Cliente], [En la reunión. Ábrela en el navegador: flechas para avanzar, *F* pantalla completa, *N* notas del presentador.],
  [Folleto \ `folleto-turing-apu.pdf`], [Cliente], [Después de la llamada o la demo, por WhatsApp o correo, o impreso en A5.],
  [Este manual], [Tú], [Para estudiar e imprimir. Vuelve a él antes de cada etapa.],
  [Empresa demo], [Tú y el cliente], [En Turing APU: Inicio → «Cargar empresa demo». Una oferta de ejemplo y 7 misiones guiadas.],
)

== Contacto que va en todo el material

#grid(
  columns: (1fr, 1fr, 1fr), column-gutter: 8pt,
  ..(("correo", "info@turingtech.com.ec", "Correo"), ("whatsapp", "099 068 6162", "WhatsApp"), ("web", "turingtech.com.ec", "Web")).map(((ic, val, e)) => block(width: 100%, fill: fondo, radius: 8pt, inset: 10pt)[
    #icono(ic, size: 14pt) #h(3pt) #text(size: 8.5pt, fill: gris)[#e] \
    #v(2pt)
    #text(weight: "bold", size: 10.5pt)[#val]
  ]),
)

// =====================================================================
= Autoevaluación
// =====================================================================

Antes de tu primera demo, responde sin mirar el manual. Si fallas una, vuelve a su capítulo.

#casilla[¿Cuál es la frase de venta de Turing APU?]
#casilla[¿Cuáles son las tres cosas que nos hacen distintos?]
#casilla[¿Qué cifras medidas puedes decir, y cuáles son solo ejemplos?]
#casilla[¿Quién decide la compra y quién decide si el sistema se usa?]
#casilla[¿Qué pides al final de la llamada de descubrimiento?]
#casilla[¿Qué haces antes de la demo con el libro del cliente?]
#casilla[¿Cuánto cuestan los planes Inicial y Equipo, al mes y al año?]
#casilla[¿Qué incluye el precio fundador y a quién aplica?]
#casilla[¿Qué respondes a «¿y si dejamos de pagar?»?]
#casilla[¿Cuáles son los cuatro criterios de éxito del piloto?]
#casilla[¿Qué tres cosas nunca puedes ceder en el precio?]
#casilla[¿Con qué pregunta cierras cada reunión?]

#v(14pt)
#block(width: 100%, fill: navy, radius: 10pt, inset: 18pt, breakable: false)[
  #text(size: 8pt, weight: "bold", fill: rgb("#FB923C"), tracking: 1.5pt)[LA PREGUNTA QUE CIERRA CADA REUNIÓN]
  #v(4pt)
  #text(size: 17pt, weight: "bold", fill: white)[«¿Qué día de esta semana nos trae su libro de Excel?»]
  #v(4pt)
  #text(size: 9.5pt, fill: rgb("#CBD5E1"))[Si el cliente ve su propio total cuadrar al centavo, la mitad de la venta está hecha.]
]
