# Decisiones

Formato: fecha · decisión · por qué · qué la cambiaría. Agregar al final, no reescribir.

**D1 · 2026-10-25 · Producto con licencia mensual, no software a la medida.**
El código es de Turingtech; SEDEMI es el primer cliente con licencia. Una sola base de código
para todos los clientes. Reabrir si un cliente exige el código fuente (entonces: escrow, no cesión).

**D2 · 2026-10-25 · Una instancia por cliente, mismo stack on-premise y gestionado.**
SEDEMI exige su servidor; otros preferirán que lo alojemos. Un solo modo de instalación evita
dos productos. Reabrir con más de ~30 clientes gestionados (ahí conviene multi-empresa).

**D3 · 2026-10-25 · TypeScript de punta a punta (React + Fastify + PostgreSQL).**
Un mismo motor de cálculo corre en navegador y servidor; Sonnet produce menos errores con
tipos. Drizzle por ser SQL explícito y migraciones simples.

**D4 · 2026-10-25 · El cálculo replica el Excel del cliente al centavo.**
La confianza del comprador depende de que "cuadre". decimal.js + orden de redondeo de
`docs/producto/modelo-calculo.md` + test de paridad con el prototipo.

**D5 · 2026-10-25 · Tiempo real con LISTEN/NOTIFY + SSE, sin Redis ni WebSocket.**
Menos piezas para instalar en el servidor del cliente. Reabrir si se necesita edición de la
misma celda por varios a la vez (CRDT).

**D6 · 2026-10-25 · Licencia firmada offline (Ed25519), con gracia y solo lectura.**
Funciona sin internet. Nunca se bloquea la exportación: el cliente no queda rehén, y eso se
usa como argumento de venta.

**D7 · 2026-10-25 · El prototipo v2 es la especificación de referencia.**
Está en `referencia/` con un índice de líneas. Si el prototipo y un doc se contradicen, manda
el doc (es más nuevo); el prototipo manda solo en el cálculo.

**D8 · 2026-10-25 · El impacto de un precio se calcula en el servidor, sobre todas las ofertas.**
Los precios son de la empresa, no de una oferta. `GET /api/insumos/:id/impacto?puAnterior=` arma cada oferta con el
motor (`impacto()`), suma APUs, rubros y diferencia, y devuelve el desglose por oferta para «Ver qué cambió».

**D9 · 2026-10-25 · Editar un APU desde la oferta pregunta el alcance; «solo en esta» copia y repunta un rubro.**
`POST /api/rubros/:id/apu/copia` duplica el APU con sus líneas (código `<cód> (2)`, `(3)`…) y repunta solo ese rubro;
las demás ofertas (y los otros rubros de la misma oferta) siguen con el original. «En todas» es `/apus/:id` con el aviso
de uso (`GET /api/apus/:id/uso`). Se abre con doble clic en una celda de solo lectura o Alt+A.

**D10 · 2026-10-25 · Una versión es la foto del `OfertaDetalle` completo y se compara con el mismo motor.**
`POST /api/ofertas/:id/versiones` guarda el detalle (cantidades y PU de ese momento) y su total con IVA; las versiones
no se editan ni se borran. La entrada del motor se arma en `calcularDetalle` (`packages/motor`), compartida por web y API.
La comparación (`comparar.ts`) cruza rubros por id: cambió / nuevo / quitado.

**D11 · 2026-10-25 · Emitir es guardar una versión con `emitida = true`.**
`POST /api/ofertas/:id/versiones` acepta `emitir: true`; la versión es inmutable como cualquier otra y la oferta sigue
siendo la misma fila editable (el «borrador nuevo»). No hay estado de oferta ni bloqueo de edición.

**D12 · 2026-10-25 · La restricción por disciplina es un ajuste de la empresa y se mide por el capítulo.**
`config_empresa.ajustes.restringirPorDisciplina` (apagado por defecto). Con él activo, un `cotizador` no puede crear, editar,
copiar el APU ni quitar rubros (ni crear capítulos) cuyo capítulo tenga una disciplina que no está entre las suyas; capítulos
sin disciplina quedan libres. `admin`, `precios` y `lector` no cambian (el lector ya no escribe). Respuesta 403 con el nombre de la disciplina.

**D13 · 2026-10-25 · Las misiones guiadas avanzan por eventos reales y su progreso vive en el navegador.**
La barra guía no simula clics: un paso termina cuando `api()` confirma una escritura (o un clic en el objetivo, o llegar a la
pantalla). El avance de misiones cumplidas se guarda en `localStorage` por usuario; es solo onboarding, no un dato del negocio. La empresa demo
se carga con `POST /api/demo/cargar` reutilizando la importación del libro (sin lógica de cálculo nueva).

**D14 · 2026-10-25 · El resumen mensual se «descarga» con la impresión del navegador.**
`/resumen` tiene estilos `@media print` (A4) y el botón llama `window.print()`; la persona elige «Guardar como PDF». Evita una librería de PDF para una página; si un cliente exige archivo generado en el servidor, se revisa. Las horas ahorradas son `(rubros por bloque × min + rubros recalculados × min) ÷ 60` con minutos editables en `config_empresa.ajustes.valor` (3 y 2 por defecto).

**D15 · 2026-10-25 · La configuración de país vive en `config_empresa`, lo visual en `ajustes.empresa`.**
Nombre, IVA y moneda usan sus columnas; logo (data URL ≤ 200 KB), acento, formato numérico (`es`/`en`) y tipo de oferta por defecto van en `ajustes.empresa` (sin migración). El formato de `lib/formato.ts` es un estado de módulo que fija el `Layout` al cargar `/api/empresa`; el `Layout` no pinta la pantalla hasta que la consulta responde, para no remontarla a mitad de una carga.

**D16 · 2026-10-25 · Sistema de diseño propio sobre shadcn/ui, sin su CLI.**
Los componentes viven copiados en `apps/web/src/ui/` (como propone shadcn), con imports relativos y `cn()` en `lib/cn.ts`; solo se agregan los que una pantalla usa. El acento de la empresa es `--acento` y Tailwind lo expone como `primario` (`@theme inline`), así cada cliente ve su marca en botones, foco y navegación. Inter va empaquetada con `@fontsource-variable/inter` porque la instalación es on-premise y puede no tener internet. Acento por defecto `#2563eb` (el gris anterior no se distinguía sobre la navegación oscura).

**D17 · 2026-10-28 · El producto se llama «Turing APU»; lo visible se renombra, los identificadores técnicos no.**
Nombre comercial siempre «Turing APU» (espacio y esas mayúsculas; en mayúsculas solo dentro del logo). Se renombraron textos de UI, mensajes de API, `<title>`, metadatos del Excel y docs. Se conservan `apuflow` en BD y usuario, servicios e imagen de Docker, nombre de los respaldos (`apuflow-AAAAMMDD-HHMMSS.dump`), claves de localStorage, nombre del paquete raíz y nombres de código (`totalApuflow`, campo `apuflow` del contrato de importación): cambiarlos rompería instalaciones y respaldos sin beneficio para el cliente. `referencia/` (prototipo) no se toca. La marca de Turing APU va en login y pie; en la navegación solo cuando la empresa no tiene logo propio.

**D18 · 2026-11-09 · Vista sencilla por empresa: esconde, no desactiva. Demos por sector.**
`ajustes.empresa.vista` (`completa` por defecto, `sencilla`) se elige en Configuración › Empresa. La sencilla es para quien presupuesta solo: oculta en la UI Historial, las pestañas Costo objetivo y Versiones (y con ellas Emitir), la presencia y el tipo de oferta, y las misiones que las usan. La API, la bitácora y los datos no cambian; volver a la completa lo muestra todo. Es configuración de la empresa, no del plan ni de la licencia (`modulos` sigue sin uso). La empresa demo se elige por sector (`POST /api/demo/cargar { sector }`): eléctrico (SEDEMI ficticio) y vivienda (insumos, 38 APUs y 8 bloques calibrados a precios por m² de referencia de una constructora: obra gris, acabados Standard/Comfort/Premium, cerramiento, pérgola, cubierta). Sus insumos llevan descripciones propias para no reutilizar precios de la otra demo. Los bloques pueden llevar tamaño (`tamano` + `unidad_tamano`, p. ej. 100 m²): al añadirlos se pide el tamaño real y las cantidades se escalan en la API (decimal.js, 6 decimales); sin tamaño se pide «veces». El cálculo de precios sigue solo en el motor: escalar es multiplicar cantidades, no precios.

**D19 · 2026-11-10 · Las ofertas nuevas nacen con los indirectos por defecto de la empresa.**
Antes una oferta creada a mano nacía sin filas de indirectos (solo las importadas los traían) y no había cómo agregarlas: se cotizaba a costo directo sin darse cuenta. Ahora nace con `ajustes.indirectosDefecto` de `config_empresa`; si no está configurado, con «Gastos generales y administrativos», «Imprevistos» y «Utilidad» en 0 %. Un administrador los fija desde el panel Indirectos de cualquier oferta («Usar estos porcentajes en las ofertas nuevas», `PUT /api/empresa/indirectos`). Se descartó copiar los de «la última oferta»: con varias personas el resultado dependía de quién editó último.
