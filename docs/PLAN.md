# APUflow: plan de desarrollo

## Qué es

Sistema web de **presupuestos con APUs** para empresas que hoy cotizan obras en Excel.
Nace del pedido de SEDEMI (subestaciones eléctricas, oct 2026) y se vende como **licencia
mensual** a cualquier empresa con el mismo problema.

**Promesa:** *Cotice en horas lo que hoy le toma días, y llegue al precio que gana la oferta.*

| Promesa | Cómo se cumple | Cómo se ve (valor percibido) |
|---|---|---|
| Velocidad | Bloques de rubros, biblioteca de APUs, importar su Excel | "Una bahía, un clic": 40 rubros con su subtotal |
| Control | Un precio cambia todos los APUs y rubros que lo usan | Panel de impacto en cada cambio |
| Ganar | Costo objetivo, rubros que más pesan, versiones | Brecha que pasa de rojo a verde |
| Equipo | Civil, Eléctrico y Mecánico en la misma oferta a la vez | Presencia y celdas que destellan |
| Sin miedo | Exporta su mismo Excel con fórmulas, siempre | "Lo mandé en su formato" |

## A quién se le vende

1. **Primero**: empresas ecuatorianas que arman ofertas con APUs en Excel y con varias
   disciplinas: eléctricas y subestaciones, constructoras medianas, metalmecánicas,
   contratistas que licitan en SERCOP (por eso CPC, origen y VAE en ofertas públicas).
2. **Después**: Perú (SEDEMI ya opera en Lima): IVA/IGV, moneda y formato por país.

Señal de calce: "cada oferta es un libro de Excel", "si cambia el cobre hay que revisar todo",
"no podemos trabajar dos en el mismo archivo", "el cliente nos dio un presupuesto referencial".

Competencia a tener presente al vender: Excel (el rival real), software de presupuestos de
obra genérico (más pesado y caro de implementar). Diferencial: cuadra con su Excel, se
implementa en días importando sus libros, colaboración simultánea, instalable en su servidor.

## Modelo de licencia

Los **precios los fija el socio**; aquí solo la estructura.

| Plan | Para quién | Incluye |
|---|---|---|
| Inicial | Un presupuestador | 1–3 usuarios, gestionado por Turingtech |
| Equipo | Varias disciplinas | Hasta ~10 usuarios, tiempo real, roles, gestionado |
| Empresa | Empresas grandes o con servidor propio | Usuarios según contrato, **on-premise**, soporte prioritario |

- Cobro mensual (descuento por pago anual). Cargo único de **implementación**: importar sus
  libros, configurar disciplinas y bloques, capacitar.
- Vencida: 15 días de gracia y luego solo lectura con exportación. Nunca se retienen datos.
- Módulos posteriores (especificación base, biblioteca sectorial) como complemento del plan.
- **SEDEMI = cliente fundador**: plan Empresa on-premise con condición preferente a cambio de
  validar cada fase y ser caso de referencia (a negociar por el socio).

## Fases (ordenadas por valor)

Cada fase termina en algo que SEDEMI puede usar y aprobar. Tickets en `docs/BACKLOG.md`.

| Fase | Semanas | Resultado | Momento de valor |
|---|---|---|---|
| F0 Cimientos | 1 | Monorepo, motor con paridad al centavo, BD, login, CI | (interno) |
| F1 Su Excel adentro | 2–3 | Importar libro, listas, APU en una pantalla, presupuesto, exportar | "Cuadra con mi Excel" |
| F2 Velocidad | 3–4 | Bloques, panel de impacto, deshacer, historial de precios, indirectos | "Una bahía, un clic" · "Cambio un precio y todo se actualiza" |
| F3 Ganar | 4–5 | Costo objetivo, brecha, rubros que pesan, versiones y comparación | "Llegamos al objetivo" |
| F4 Equipo | 5–6 | Usuarios, roles, disciplinas, tiempo real, presencia, bitácora | "Trabajamos los tres a la vez" |
| F5 Vendible | 6–7 | Licencia, instalador Docker, respaldos, empresa demo + misiones, panel de valor, país | "Esto me ahorró N horas" |
| F6 Crecer | después | Especificación base paramétrica, biblioteca de APUs por sector, cotizaciones de proveedores | Venta adicional |

**Corte para SEDEMI = F0 a F5.** El plazo comprometido (1 a 1,5 meses de desarrollo después
del análisis) solo se cumple si nada de F6 entra antes. Lo que SEDEMI pida fuera de F0–F5
va al final del backlog con etiqueta `[SEDEMI-extra]`.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Su Excel real no cuadra con nuestro cálculo | Pedir en el análisis un libro anonimizado; test de paridad con su total |
| Libros de otros clientes con estructura distinta | Importador por encabezados + perfiles de importación en JSON |
| 5.000+ rubros lentos | Tabla virtualizada, cálculo incremental si hace falta, prueba de volumen en F5 |
| Servidor del cliente sin Docker o sin internet | Requisitos en el análisis; licencia offline; instalador probado en Ubuntu LTS |
| SEDEMI pide personalizaciones | Todo como configuración del producto, nunca un fork por cliente |
| Propuesta firmada con "el código es de ustedes" | Rehacer la propuesta a licencia antes de empezar (pendiente en turingtech-docs) |

## Indicadores del producto

- Tiempo hasta "cuadra" (subir libro → total igual): objetivo < 10 min.
- Ofertas por usuario activo por mes.
- % de rubros que entran por bloque vs a mano.
- Cambios de precio aplicados (cada uno = revisión manual evitada).
- Renovación mensual.
