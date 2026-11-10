// Estilo compartido de las guías de uso (misma marca que el manual comercial y la app).
// Se importa con: #import "comun-guias.typ": *

#let navy = rgb("#0F172A")
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

// Página y tipografía; `pie` es el texto fijo del pie de página.
#let guia(titulo, pie, cuerpo) = {
  set document(title: titulo, author: "Corporación Turingtech S.A.S.")
  set page(
    paper: "a4",
    margin: (x: 18mm, top: 18mm, bottom: 20mm),
    footer: context {
      set text(size: 8pt, fill: gris)
      line(length: 100%, stroke: 0.5pt + linea)
      v(-4pt)
      grid(columns: (1fr, auto), pie, counter(page).display())
    },
  )
  set text(font: ("Inter", "Arial"), size: 10.5pt, fill: tinta, lang: "es", number-type: "lining")
  set par(leading: 0.68em, justify: false, spacing: 0.95em)
  set list(indent: 4pt, body-indent: 6pt, spacing: 0.7em, marker: text(fill: naranja)[•])
  set enum(indent: 4pt, body-indent: 6pt, spacing: 0.7em)
  set table(stroke: 0.5pt + linea, inset: 7pt)
  show table.cell.where(y: 0): set text(weight: "bold", fill: navy, size: 9.5pt)
  show table.cell.where(y: 0): set table.cell(fill: fondo)
  show heading.where(level: 1): it => block(width: 100%, above: 4pt, below: 12pt)[
    #text(size: 20pt, weight: "bold", fill: tinta)[#it.body]
    #v(4pt)
    #line(length: 18mm, stroke: 3pt + naranja)
  ]
  show heading.where(level: 2): it => block(width: 100%, above: 16pt, below: 7pt, sticky: true)[
    #text(size: 13pt, weight: "bold", fill: navy)[#it.body]
  ]
  cuerpo
}

// Logo: isotipo + «TURING» + «APU» en naranja, como LogoTuringApu.tsx.
#let logo(alto: 14pt, oscuro: false) = box(baseline: 15%)[
  #box(baseline: 12%, image(if oscuro { "assets/turing-apu-isotipo-oscuro.png" } else { "assets/turing-apu-isotipo-claro.png" }, height: alto))
  #h(0.5em)
  #text(size: alto, weight: "bold", fill: if oscuro { white } else { navy }, tracking: 0.04em)[TURING #text(fill: naranja)[APU]]
]

// Captura de la app con marco de ventana.
#let captura(ruta, pie: none, ancho: 100%) = align(center, block(width: ancho, above: 6pt, below: 10pt, breakable: false)[
  #block(width: 100%, clip: true, radius: 7pt, stroke: 0.6pt + linea, fill: white)[
    #block(width: 100%, fill: fondo, inset: (x: 8pt, y: 5pt), below: 0pt)[
      #for c in (rgb("#F87171"), rgb("#FBBF24"), rgb("#34D399")) { box(circle(radius: 2.6pt, fill: c)); h(3pt) }
    ]
    #image(ruta, width: 100%)
  ]
  #if pie != none { align(center, text(size: 8.5pt, fill: gris, style: "italic")[#pie]) }
])

// Recuadro con título pequeño (consejo, ojo, etc.).
#let nota(txt, titulo: "CONSEJO", color: ambar, fondo-color: ambar-suave) = block(
  width: 100%, fill: fondo-color, inset: (x: 12pt, y: 10pt), radius: 6pt,
  stroke: (left: 3pt + color), above: 8pt, below: 10pt, breakable: false,
)[
  #text(size: 7.5pt, fill: color, weight: "bold", tracking: 1pt)[#titulo]
  #v(2pt)
  #txt
]

// Paso numerado con lo que se logra.
#let paso(n, titulo, logra) = block(width: 100%, above: 14pt, below: 8pt, breakable: false, sticky: true)[
  #grid(
    columns: (30pt, 1fr), column-gutter: 10pt, align: horizon,
    box(width: 30pt, height: 30pt, fill: naranja, radius: 15pt)[#align(center + horizon)[#text(fill: white, weight: "bold", size: 13pt)[#n]]],
    [#text(size: 14pt, weight: "bold")[#titulo] \ #text(size: 9.5pt, fill: verde, weight: "bold")[Logra: ]#text(size: 9.5pt)[#logra]],
  )
]

// Casilla para marcar a mano.
#let casilla(txt) = block(above: 6pt, below: 6pt, breakable: false)[
  #grid(columns: (16pt, 1fr), box(width: 10pt, height: 10pt, stroke: 1pt + gris, radius: 2pt, baseline: 1pt), txt)
]

// Botón o menú de la app, tal como se ve.
#let boton(txt) = box(fill: fondo, stroke: 0.6pt + linea, inset: (x: 5pt, y: 2pt), radius: 4pt, baseline: 2pt)[#text(size: 9.5pt, weight: "medium")[#txt]]
