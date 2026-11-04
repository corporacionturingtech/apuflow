// Folleto de Turing APU — para mostrar, enviar o imprimir y entregar al cliente (a diferencia
// de manual-equipo-comercial.typ, que es de uso interno del equipo comercial).
//
// 8 páginas A5 (múltiplo de 4: se puede imprimir como cuadernillo plegado):
// portada · por qué Turing APU · cuadra y bloques · control · planes · preguntas frecuentes ·
// cómo empezamos · contraportada con QR de WhatsApp.
//
// Capturas reales de la app con la empresa demo (datos ficticios) en assets/app-*.png; íconos
// Lucide en assets/icons/. Precios: los mismos de la lámina de precios de
// presentacion-turing-apu.html y del manual. Cifras medidas: docs/BACKLOG.md.
//
// Compilar desde la raíz del repo (necesita @preview/zebra:0.1.0, ya en la caché de Typst):
//   typst compile --root docs/comercial docs/comercial/folleto-turing-apu.typ

#import "@preview/zebra:0.1.0": qrcode

#let navy = rgb("#0F172A")
#let navy-2 = rgb("#1E293B")
#let naranja = rgb("#EA580C")
#let naranja-osc = rgb("#C2410C")
#let naranja-suave = rgb("#FFF1E8")
#let verde = rgb("#15803D")
#let tinta = rgb("#0F172A")
#let gris = rgb("#64748B")
#let linea = rgb("#E2E8F0")
#let fondo = rgb("#F6F7F9")
#let sobre-navy = rgb("#CBD5E1")

#let whatsapp-numero = "+593 99 068 6162"
#let whatsapp-url = "https://wa.me/593990686162"

#set document(title: "Turing APU · Presupuestos de obra con APUs", author: "Corporación Turingtech S.A.S.")

#set page(
  paper: "a5",
  margin: (x: 14mm, top: 15mm, bottom: 17mm),
  footer: context {
    set text(size: 7.5pt, fill: gris)
    line(length: 100%, stroke: 0.5pt + linea)
    v(-3pt)
    grid(
      columns: (1fr, auto),
      text(weight: "bold", fill: navy, tracking: 0.5pt)[TURING #text(fill: naranja)[APU]],
      [#counter(page).display() / #counter(page).final().first()],
    )
  },
)

#set text(font: ("Inter", "Arial"), size: 9.5pt, fill: tinta, lang: "es")
#set par(leading: 0.62em, justify: false)

// ---------- Componentes ----------

#let icono(nombre, size: 13pt, color: "") = image("assets/icons/" + nombre + color + ".svg", width: size)

#let icono-tile(nombre, size: 24pt, fill: naranja-suave, color: "") = box(
  width: size, height: size, fill: fill, radius: size * 0.28,
)[#align(center + horizon)[#icono(nombre, size: size * 0.54, color: color)]]

#let logo(alto: 14pt, oscuro: false) = box[
  #box(baseline: 12%, image(if oscuro { "assets/turing-apu-isotipo-oscuro.png" } else { "assets/turing-apu-isotipo-claro.png" }, height: alto))
  #h(0.45em)
  #text(size: alto, weight: "bold", fill: if oscuro { white } else { navy }, tracking: 0.04em)[TURING #text(fill: naranja)[APU]]
]

#let seccion(num, antetitulo, titulo, bajada: none) = block(width: 100%, below: 12pt)[
  #stack(dir: ttb, spacing: 0pt,
    text(size: 7.5pt, weight: "bold", fill: naranja-osc, tracking: 1.4pt)[#num #h(3pt) · #h(3pt) #upper(antetitulo)],
    9pt,
    text(size: 19pt, weight: "bold", fill: tinta, tracking: -0.4pt)[#titulo],
    9pt,
    box(width: 24pt, height: 3pt, fill: naranja, radius: 1.5pt),
    ..if bajada != none { (9pt, text(size: 9.5pt, fill: gris)[#bajada]) },
  )
]

#let pantalla(ruta, pie: none, alto: auto) = block(width: 100%, breakable: false)[
  #block(width: 100%, fill: white, stroke: 0.7pt + linea, radius: 7pt, clip: true)[
    #block(width: 100%, fill: fondo, inset: (x: 7pt, y: 4.5pt), below: 0pt)[
      #for c in (rgb("#F87171"), rgb("#FBBF24"), rgb("#34D399")) { box(circle(radius: 2pt, fill: c)); h(2pt) }
    ]
    #line(length: 100%, stroke: 0.5pt + linea)
    #block(width: 100%, above: 0pt, height: alto, clip: true)[#image(ruta, width: 100%)]
  ]
  #if pie != none [
    #v(3pt)
    #align(center)[#text(size: 7.5pt, fill: gris, style: "italic")[#pie]]
  ]
]

#let funcion(icon, titulo, descripcion, ultima: false) = block(
  width: 100%, inset: (y: 6.5pt), stroke: if ultima { none } else { (bottom: 0.5pt + linea) },
  above: 0pt, below: 0pt, breakable: false,
)[
  #grid(
    columns: (24pt, 1fr), column-gutter: 10pt,
    icono-tile(icon),
    [
      #text(size: 10.5pt, weight: "bold")[#titulo]
      #v(-4pt)
      #text(size: 8.8pt, fill: gris)[#descripcion]
    ],
  )
]

#let pilar(icon, titulo, texto) = block(
  width: 100%, height: 100%, fill: white, stroke: 0.7pt + linea, radius: 8pt, inset: 9pt,
)[
  #icono-tile(icon, size: 22pt)
  #v(5pt)
  #text(size: 9.5pt, weight: "bold")[#titulo]
  #v(-3pt)
  #text(size: 8.3pt, fill: gris)[#texto]
]

#let garantia(icon, texto) = grid(
  columns: (20pt, 1fr), column-gutter: 7pt, align: horizon,
  box(width: 20pt, height: 20pt, fill: white, radius: 5pt)[#align(center + horizon)[#icono(icon, size: 11pt)]],
  text(size: 8.6pt)[#texto],
)

#let plan(nombre, precio, periodo, filas, destacado: false) = block(
  width: 100%, height: 100%, radius: 10pt, inset: (x: 9pt, y: 11pt),
  fill: if destacado { gradient.linear(navy-2, navy, angle: 90deg) } else { white },
  stroke: if destacado { 1.5pt + naranja } else { 0.7pt + linea },
)[
  #let t = if destacado { white } else { tinta }
  #let s = if destacado { sobre-navy } else { gris }
  #set text(fill: t)
  #align(center)[
    #box(fill: if destacado { naranja } else { none }, inset: (x: 6pt, y: 2.5pt), radius: 8pt, text(size: 6.5pt, weight: "bold", fill: if destacado { white } else { white.transparentize(100%) }, tracking: 0.8pt)[RECOMENDADO])
    #v(2pt)
    #text(size: 11pt, weight: "bold")[#nombre]
    #v(-2pt)
    #text(size: 20pt, weight: "bold", fill: if destacado { rgb("#FB923C") } else { naranja-osc }, tracking: -0.5pt)[#precio]
    #v(-4pt)
    #text(size: 7.2pt, fill: s)[#periodo]
  ]
  #v(2pt)
  #for (i, (k, val)) in filas.enumerate() {
    line(length: 100%, stroke: 0.4pt + if destacado { rgb("#334155") } else { linea })
    v(-5pt)
    text(size: 6.6pt, fill: s, tracking: 0.3pt)[#upper(k)]
    v(-7pt)
    text(size: 9pt, weight: "bold")[#val]
    v(-2pt)
  }
]

#let pregunta(p, r) = block(
  width: 100%, inset: (left: 9pt, y: 2pt), stroke: (left: 2.5pt + naranja), above: 10pt, below: 0pt, breakable: false,
)[
  #text(size: 10pt, weight: "bold")[#p]
  #v(-3pt)
  #text(size: 8.8pt, fill: gris)[#r]
]

#let paso(n, titulo, texto, ultimo: false) = grid(
  columns: (22pt, 1fr), column-gutter: 10pt,
  [
    #box(width: 22pt, height: 22pt, fill: naranja, radius: 11pt)[#align(center + horizon)[#text(fill: white, weight: "bold", size: 10pt)[#n]]]
    #if not ultimo { align(center, line(angle: 90deg, length: 30pt, stroke: (paint: naranja, thickness: 1pt, dash: "dotted"))) }
  ],
  [
    #text(size: 11pt, weight: "bold")[#titulo]
    #v(-4pt)
    #text(size: 8.8pt, fill: gris)[#texto]
  ],
)

// =====================================================================
// 1 · PORTADA
// =====================================================================

#page(margin: 0pt, footer: none)[
  #place(bottom, block(width: 100%, height: 38%, fill: gradient.linear(navy-2, navy, angle: 90deg)))
  #pad(x: 14mm, top: 15mm)[
    #logo(alto: 17pt)
    #v(14mm)
    #text(size: 7.5pt, weight: "bold", fill: naranja-osc, tracking: 1.6pt)[PRESUPUESTOS DE OBRA CON APUs]
    #v(6pt)
    #block(width: 100%)[
      #set par(leading: 0.38em)
      #text(size: 27pt, weight: "bold", tracking: -0.8pt)[Cotice en horas\ lo que hoy le toma\ #text(fill: naranja)[días.]]
    ]
    #v(6pt)
    #block(width: 95%)[#text(size: 10.5pt, fill: gris)[Turing APU lee su libro de Excel, lo cuadra al centavo y le deja
    armar, ajustar y enviar cada oferta en equipo. Y llegar al precio que gana.]]
    #v(8mm)
    #pantalla("assets/app-oferta-portada.png")
    #v(1fr)
  ]
  #place(bottom + left, dx: 14mm, dy: -11mm, block(width: 120mm)[
    #grid(
      columns: (1fr, 1fr, 1fr), column-gutter: 6pt,
      ..(("excel", "Cuadra con\nsu Excel"), ("equipo", "Todas las disciplinas\na la vez"), ("exportar", "Exporta a Excel,\nsiempre")).map(((ic, t)) => align(center)[
        #icono-tile(ic, size: 24pt, fill: white.transparentize(88%), color: "-blanco")
        #v(3pt)
        #text(size: 8.5pt, weight: "medium", fill: white)[#t]
      ]),
    )
  ])
]

// =====================================================================
// 2 · POR QUÉ TURING APU
// =====================================================================

#seccion("01", "Por qué Turing APU", "Su Excel, sin sus límites")

#text(size: 10.5pt)[Cada oferta es un libro de Excel con cientos de rubros. Si sube el cobre, alguien revisa APU por APU.
Si trabajan tres disciplinas, se pasan el archivo en fila. Y una fórmula mal arrastrada cambia el total sin avisar.]

#text(size: 9.5pt, fill: gris)[Turing APU se siente como su Excel, pero hace solo lo que hoy le quita horas.]

#v(5pt)
#grid(
  columns: (1fr, 1fr, 1fr), column-gutter: 7pt, rows: 37mm,
  pilar("bloques", "Más rápido", [Una bahía completa entra a la oferta en un clic, con sus APUs.]),
  pilar("impacto", "Bajo control", [Cambie un precio y vea qué APUs y rubros se movieron, y cuánto.]),
  pilar("objetivo", "Para ganar", [Escriba el presupuesto referencial y vea qué rubros recortar.]),
)

#v(9pt)
#block(width: 100%, fill: fondo, radius: 9pt, inset: 11pt)[
  #text(size: 7.5pt, weight: "bold", fill: naranja-osc, tracking: 1.4pt)[LO QUE LE GARANTIZAMOS]
  #v(6pt)
  #grid(
    columns: (1fr, 1fr), column-gutter: 10pt, row-gutter: 8pt,
    garantia("check-circulo", [Su total cuadra al centavo con su Excel]),
    garantia("exportar", [Exportar a Excel nunca se bloquea]),
    garantia("candado", [Una instalación solo para su empresa]),
    garantia("servidor", [En nuestra nube o en su servidor]),
  )
]

#v(1fr)
#block(width: 100%, fill: gradient.linear(naranja, naranja-osc, angle: 0deg), radius: 10pt, inset: (x: 12pt, y: 11pt))[
  #grid(
    columns: (1fr, auto), align: horizon,
    [
      #text(size: 12.5pt, weight: "bold", fill: white)[Traiga su libro de Excel]
      #v(-3pt)
      #text(size: 8.8pt, fill: white)[Lo cuadramos en vivo, en 10 minutos, frente a usted.]
    ],
    box(width: 28pt, height: 28pt, fill: white.transparentize(80%), radius: 8pt)[#align(center + horizon)[#icono("excel", size: 15pt, color: "-blanco")]],
  )
]

#pagebreak()

// =====================================================================
// 3 · CUADRA Y BLOQUES
// =====================================================================

#seccion("02", "Desde el primer día", "Suba su libro. Cuadra al centavo.")

#pantalla("assets/app-cuadra.png", pie: [Su libro importado: el mismo total que en su Excel, al centavo.])
#v(6pt)

#funcion("excel", "Lee su Excel tal como está", [Listas de precios, APUs, capítulos y rubros. Si algo no cuadra, le dice en qué rubro. Su libro original queda intacto.])
#funcion("bloques", "Bloques de rubros", [Guarde una bahía, un pórtico o una malla de tierra una vez, y añádala completa a cualquier oferta.])
#funcion("lista", "El APU completo en una pantalla", [Equipos, mano de obra, materiales y transporte, con su rendimiento y su precio unitario.])
#funcion("dolar", "Listas de precios", [Materiales, equipos, mano de obra y transporte, con el historial de cada precio.], ultima: true)

#pagebreak()

// =====================================================================
// 4 · CONTROL
// =====================================================================

#seccion("03", "Control de cada cifra", "Cambie un precio. Todo se actualiza.")

#pantalla("assets/app-impacto.png", pie: [El cable 2/0 AWG pasó de \$ 9,60 a \$ 10,40: el sistema dice qué afectó y en cuánto.])
#v(6pt)

#funcion("impacto", "Panel de impacto", [Cada APU y cada rubro que usa ese insumo se recalcula solo, y usted ve cuánto se movió la oferta.])
#funcion("objetivo", "Costo objetivo", [Escriba el presupuesto referencial: le dice cuánto falta y qué rubros pesan más.])
#funcion("equipo", "Todas las disciplinas a la vez", [Civil, Eléctrico y Mecánico en la misma oferta, viendo dónde está cada uno.])
#funcion("historial", "Historial y versiones", [Quién cambió qué, con el valor de antes y el de después. Deshacer con un clic.])
#funcion("exportar", "Exporta a Excel, siempre", [Su cliente recibe su mismo formato, con fórmulas entre hojas.], ultima: true)

#pagebreak()

// =====================================================================
// 5 · PLANES
// =====================================================================

#seccion("04", "Planes", "Precios claros, en dólares", bajada: [Todo el sistema viene en los tres planes. Cambian los usuarios, dónde vive y el soporte.])

#grid(
  columns: (1fr, 1fr, 1fr), column-gutter: 6pt, rows: 76mm,
  plan("Inicial", "$ 79", "al mes · o $ 790 al año", (("Usuarios", "Hasta 3"), ("Dónde vive", "Nube Turingtech"), ("Implementación", "$ 350"))),
  plan("Equipo", "$ 249", "al mes · o $ 2.490 al año", (("Usuarios", "Hasta 10"), ("Dónde vive", "Nube Turingtech"), ("Implementación", "$ 900")), destacado: true),
  plan("Empresa", "$ 490", "desde · al mes, pago anual", (("Usuarios", "Según contrato"), ("Dónde vive", "Su servidor"), ("Implementación", "Desde $ 1.800"))),
)

#v(9pt)
#block(width: 100%, fill: fondo, radius: 9pt, inset: 11pt)[
  #text(size: 7.5pt, weight: "bold", fill: naranja-osc, tracking: 1.4pt)[INCLUIDO EN LOS TRES PLANES]
  #v(5pt)
  #set text(size: 8.2pt)
  #for t in ("Importar su Excel", "Bloques", "Panel de impacto", "Costo objetivo", "Historial", "Exportar a Excel", "Respaldo diario", "IVA, CPC y VAE") {
    box(fill: white, stroke: 0.5pt + linea, inset: (x: 6pt, y: 3.5pt), radius: 8pt)[#t]
    h(3pt)
  }
]

#v(8pt)
#block(width: 100%, fill: naranja-suave, radius: 9pt, inset: 11pt, stroke: (left: 3pt + naranja))[
  #text(size: 10pt, weight: "bold")[Precio fundador]
  #v(-3pt)
  #text(size: 8.8pt)[Para las primeras 10 empresas: implementación al 50 % y tarifa congelada 12 meses.]
]

#v(1fr)
#text(size: 7.8pt, fill: gris)[Precios en dólares, más IVA. Pago anual: 2 meses gratis. Sin permanencia: si se va, se lleva su Excel.
La implementación es un pago único: subimos sus libros, configuramos y capacitamos a su equipo.]

#pagebreak()

// =====================================================================
// 6 · PREGUNTAS FRECUENTES
// =====================================================================

#seccion("05", "Preguntas frecuentes", "Lo que suelen preguntarnos")

#pregunta([¿Tengo que dejar de usar Excel?], [No. Turing APU importa su libro tal como está y exporta su oferta en el mismo formato, con sus hojas y fórmulas.])
#pregunta([¿Qué pasa si se vence la licencia?], [Tiene 15 días de gracia. Después el sistema queda en solo lectura: puede ver y exportar todo, nunca pierde sus datos.])
#pregunta([¿Dónde quedan mis precios?], [En nuestra nube, en una instalación solo para su empresa, con HTTPS y respaldo diario. O, si lo prefiere, en su propio servidor, con una licencia que funciona sin internet.])
#pregunta([¿Sirve para ofertas en SERCOP?], [Sí. Maneja IVA 15 %, y CPC, origen y VAE por rubro en ofertas públicas.])
#pregunta([¿Es rápido con ofertas grandes?], [Sí. Una oferta de 5.000 rubros se recalcula en 84 milisegundos.])
#pregunta([¿Pueden trabajar varias personas a la vez?], [Sí. Cada disciplina trabaja su capítulo en la misma oferta y los cambios llegan al instante, sin pisarse.])
#pregunta([¿Puedo probarlo antes de contratar?], [Sí. Hacemos un piloto de 14 días con su próxima oferta y sus propios datos, sin costo.])

#pagebreak()

// =====================================================================
// 7 · CÓMO EMPEZAMOS
// =====================================================================

#seccion("06", "Cómo empezamos", "De su Excel a cotizar, en días", bajada: [Nosotros hacemos el trabajo pesado. Usted nos trae su libro.])

#paso("1", "Subimos sus libros", [Importamos sus listas de precios, APUs y ofertas, y comprobamos que cuadren al centavo.])
#paso("2", "Configuramos", [Disciplinas, usuarios y roles, los bloques que más repite y el logo de su empresa.])
#paso("3", "Capacitamos por rol", [Quien cotiza, quien actualiza precios y quien solo consulta, cada uno con su manual.])
#paso("4", "Cotiza", ultimo: true, [Su equipo arma la siguiente oferta en Turing APU, con nuestro soporte.])

#v(1fr)
#pantalla("assets/app-objetivo.png", pie: [Costo objetivo: los rubros que más pesan, para llegar al presupuesto referencial.])

// =====================================================================
// 8 · CONTRAPORTADA
// =====================================================================

#page(margin: (x: 16mm, top: 18mm, bottom: 14mm), fill: navy, footer: none)[
  #set text(fill: white)
  #align(center)[
    #logo(alto: 17pt, oscuro: true)
    #v(1fr)
    #text(size: 7.5pt, weight: "bold", fill: rgb("#FB923C"), tracking: 1.4pt)[PILOTO DE 14 DÍAS CON SUS DATOS]
    #v(5pt)
    #block(width: 95%)[
      #set par(leading: 0.42em)
      #text(size: 21pt, weight: "bold", tracking: -0.6pt)[¿Qué día nos trae\ su libro de Excel?]
    ]
    #v(5pt)
    #text(size: 10pt, fill: sobre-navy)[Lo cuadramos en vivo, en 10 minutos.]
    #v(9mm)
    #block(fill: white, radius: 14pt, inset: 12pt)[#qrcode(whatsapp-url, width: 34mm, fill: navy)]
    #v(4pt)
    #text(size: 7.5pt, fill: sobre-navy)[Escanee el código para escribirnos]
    #v(7mm)
    #box(icono("whatsapp", size: 15pt, color: "-blanco"), baseline: 20%)
    #h(4pt)
    #link(whatsapp-url)[#text(size: 18pt, weight: "bold", tracking: -0.3pt)[#whatsapp-numero]]
    #v(-2pt)
    #text(size: 9pt, fill: sobre-navy)[info\@turingtech.com.ec · turingtech.com.ec]
    #v(1fr)
    #line(length: 30%, stroke: 0.5pt + white.transparentize(65%))
    #v(2pt)
    #text(size: 7.5pt, fill: sobre-navy)[Presupuestos de obra con APUs · Corporación Turingtech S.A.S. · Ecuador]
  ]
]
