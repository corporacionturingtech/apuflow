# Backlog

Un ticket = una sesión de Sonnet (S ≈ 1 h de trabajo del modelo, M ≈ 2 h). Si un ticket
crece más, se parte en dos antes de seguir. Se toman **en orden**; `/siguiente` elige el
primer `[ ]` cuyas dependencias estén en `[x]`.

Formato: `[ ] ID · título · tamaño · dep` / **Leer** (docs que el ticket necesita, nada más) /
**Hecho cuando** (criterio verificable).

Estados: `[ ]` pendiente · `[~]` en curso · `[x]` hecho · `[-]` descartado (con motivo).

---

## F0 · Cimientos

- [x] **F0-01** · Entorno y monorepo · S
  **Leer:** arquitectura.md (estructura). Este equipo no tiene `node`: instalar Node 22 LTS con
  `fnm` y `corepack enable pnpm`. Crear workspaces, TS estricto compartido, ESLint, Prettier,
  Vitest, scripts raíz `typecheck`, `lint`, `test`.
  **Hecho cuando:** `pnpm typecheck && pnpm lint && pnpm test` pasan en vacío.

- [x] **F0-02** · Fixture demo desde el prototipo · S · F0-01
  **Leer:** referencia/INDICE.md (DATA, 477–631). Script `scripts/extraer-fixture.ts` que extrae
  `DATA` con `node:vm` a `packages/motor/test/fixtures/sedemi-demo.json`.
  **Hecho cuando:** el JSON tiene los conteos de insumos, APUs y bloques del prototipo.

- [x] **F0-03** · Motor: APU y oferta con paridad · M · F0-02
  **Leer:** producto/modelo-calculo.md, producto/dominio.md. `redondeo.ts`, `apu.ts`,
  `oferta.ts` con decimal.js. Test de paridad que ejecuta `apuCalc`/`calc` originales (líneas
  723–785) con `node:vm` sobre una oferta armada con todos los bloques.
  **Hecho cuando:** cada APU, cada rubro y el total coinciden al centavo; casos de redondeo .005.
  _Medido:_ paridad con 3 escenarios (factor 1; 1,0734 y 0,9871 con cantidades fraccionarias), 31 pruebas verdes.

- [x] **F0-04** · Motor: impacto, objetivo y peso · S · F0-03
  **Leer:** modelo-calculo.md (impacto, objetivo). `impacto(oferta, cambio)` devuelve APUs,
  rubros, antes, después; `brecha()`; `rubrosQueMasPesan()`.
  **Hecho cuando:** tests con el fixture; recálculo de 5.000 rubros < 150 ms en Node.
  _Medido:_ `impacto` con 5.029 rubros ≈ 56 ms (reusando el cálculo «antes»); 46 pruebas del motor verdes. Los ms los mide la UI, no el motor.

- [x] **F0-05** · API base y BD · M · F0-01
  **Leer:** arquitectura.md (datos). Fastify, Drizzle, esquema completo de `dominio.md`,
  migraciones, `docker-compose.dev.yml` con Postgres, endpoint `/api/salud`.
  **Hecho cuando:** `pnpm --filter api test` levanta la BD, migra y pasa.
  _Medido:_ 15 tablas, migración `0000`, 6 pruebas de la API verdes. Postgres de desarrollo en el puerto 5433 (el 5432 suele estar ocupado).

- [x] **F0-06** · Login y sesión · S · F0-05
  Usuario/clave (argon2), cookie httpOnly, seed de un admin, middleware de rol.
  **Hecho cuando:** tests de login correcto, incorrecto y ruta protegida.
  _Medido:_ 9 pruebas nuevas de auth (login ok/incorrecto/inexistente/inactivo, 401/403, logout, expiración, seed idempotente); 15 pruebas de la API verdes. Migración `0001` (tabla `sesion`).

- [x] **F0-07** · Web base · M · F0-06
  **Leer:** producto/ux.md (estilo, pantallas). Vite, React, TanStack Router/Query, Tailwind,
  shadcn/ui. Login, layout con navegación lateral y **barra de totales fija** (vacía por ahora),
  formato `$ 1.313,64` y entrada `10,40` (portar `fmt`/`parseNum`, líneas 645–674).
  **Hecho cuando:** e2e `login.spec.ts` entra y ve el layout.
  _Medido:_ 3 e2e verdes (redirige sin sesión, clave incorrecta, entra y ve nav + barra de totales a 1366×768); 5 pruebas de web (formato, BarraTotales). shadcn/ui no se instaló aún: los componentes de F0-07 son Tailwind simple; agregar shadcn al primer ticket que necesite tablas/diálogos (F1-01).

- [x] **F0-08** · CI · S · F0-07
  GitHub Actions: typecheck, lint, test, e2e. **Hecho cuando:** pipeline verde.
  _Medido:_ `.github/workflows/ci.yml` (Postgres 16 en 5433, Node 22). Mismos comandos en local: typecheck, lint, 68 pruebas y 3 e2e verdes. **Pendiente:** confirmar el verde en GitHub tras el primer push.

## F1 · Su Excel adentro (momento: "cuadra")

- [x] **F1-01** · Listas de precios: Materiales (patrón de referencia) · M · F0-07
  **Leer:** dominio.md, ux.md (reglas 2–4). CRUD API + tabla tipo Excel virtualizada con edición
  por teclado, FACTOR, precio referencial, secciones por disciplina, búsqueda.
  **Este ticket define el patrón** (módulo API + tabla editable) que copian los siguientes.
  **Hecho cuando:** e2e edita un precio con teclado y persiste; 2.000 filas fluidas.
  _Medido:_ 6 pruebas de API (409, bitácora, historial, 403), 5 de web, 2 e2e verdes; con 2.000 filas el DOM pinta <80 filas y el final se alcanza en <2 s. Molde: `apps/api/src/modulos/insumos/`, `apps/web/src/componentes/TablaEditable.tsx` y `pantallas/Materiales.tsx`. Se usó solo `@tanstack/react-virtual` (sin react-table). Trampas: el driver de Drizzle manda los escalares de `jsonb` como texto crudo (`"9.6"` se guardaba como número), por eso la bitácora guarda `{ valor }`; en jsdom el virtualizador mide con `clientHeight/clientWidth` (mockearlos). Falta de F1-01: borrado con papelera y alta desde la UI (la API de alta existe).

- [x] **F1-02** · Equipos, Mano de obra, Transporte · S · F1-01
  Copiar el patrón de F1-01 (no rediseñar). Herramienta menor en Equipos.
  **Hecho cuando:** las cuatro listas funcionan igual.
  _Medido:_ 3 pruebas de API nuevas (lista por tipo, herramienta menor con bitácora/409/403/400), 3 de web, 4 e2e nuevos verdes (P.U. por teclado en EQ/MO/TR + herramienta menor). Molde reutilizable: `pantallas/ListaPrecios.tsx` con `LISTAS[...]`; la herramienta menor (`PATCH /api/herramienta-menor`) edita `config_empresa.pct_herramienta_menor`, fila que ahora se crea sola si falta.

- [x] **F1-02b** · Alta y papelera de insumos · S · F1-02
  **Leer:** ux.md (regla 10). Botón Agregar, Supr elimina a la papelera con Deshacer, papelera
  con Restaurar; borrado lógico (`eliminado_en`), código único entre activos del mismo tipo.
  **Hecho cuando:** e2e agrega, edita, elimina y restaura un insumo y persiste tras recargar.
  _Medido:_ 3 pruebas de API nuevas (papelera + bitácora, 409/403/404, código repetido al crear y restaurar), 1 de web, 1 e2e verde (10 e2e en total). Migración `0002` (`insumo.eliminado_en`). Trampa: Supr justo tras editar usaba la versión vieja de la fila (409 falso); la lista espera si hay un guardado en curso. Código único solo entre activos del mismo tipo.

- [x] **F1-03** · Biblioteca de APUs y pantalla APU · M · F1-02b
  **Leer:** ux.md (regla 5), INDICE (995–1059). Los cuatro componentes en una pantalla,
  rendimiento, agregar/quitar líneas buscando insumos, cálculo al pie con el motor.
  **Hecho cuando:** e2e abre un APU, sube ayudantes de 3 a 4 y el CU cambia como en el prototipo.
  _Medido:_ 5 pruebas de API (lista/detalle, cantidad + bitácora, 409/403, rendimiento, agregar/quitar), 1 de web, 1 e2e verde (11 en total). El pie usa un campo local "Indirectos %" (no se guarda): F1-04 lo reemplaza por los indirectos de la oferta. Semilla propia del e2e: `pnpm --filter api db:seed-apu` (insumos `APU-E2E-*`, no `LST-*`: otros e2e editan esos precios y `seed-volumen` los borra).

- [x] **F1-04** · Ofertas, capítulos y rubros · M · F1-03
  **Leer:** INDICE (928–994). Lista de ofertas, datos generales, tipo público/privado (columnas
  distintas), capítulos, rubros con cantidad, numeración, tabla virtualizada, barra de totales real.
  **Hecho cuando:** oferta de 1.500 rubros (generada) edita cantidades sin lag.
  _Medido:_ 4 pruebas de API (lista/detalle, rol, cantidad + bitácora + 409, datos generales y capítulo), 3 de web, 1 e2e verde (12 en total): oferta de 1.500 rubros (`pnpm --filter api db:seed-oferta`, prefijo `OFE-E2E*`), la barra pasa de $ 15.000,00 a $ 15.020,00 al editar y persiste. Cálculo en la web con `calcularOferta`; el motor ahora acepta `herramientaMenor` por APU. Indirectos de la oferta: solo lectura aquí (se editan en F2-04). Detalle completo en un GET; PATCH de rubro devuelve solo `{id, cantidad, version}`.

- [x] **F1-04b** · Añadir y quitar rubros y capítulos · S · F1-04
  **Leer:** INDICE (928–994). Buscador de APUs para añadir rubro, quitar rubro/capítulo, plegar
  capítulos, numeración y código de rubro editables, CPC/origen/VAE editables en ofertas públicas.
  **Hecho cuando:** e2e añade un rubro desde la biblioteca y el total de la barra sube.
  _Medido:_ 3 pruebas de API nuevas (40 en total), 18 de web, e2e `presupuesto-rubros` verde (13 e2e en total): añadir rubro desde la biblioteca sube la barra a $ 10,00, plegar la conserva, Supr la deja en $ 0,00. Semilla propia: `pnpm --filter api db:seed-rubros` (`RUB-E2E*`, ofertas `OFE-RUB*`). Quitar rubro/capítulo es borrado físico con bitácora (ux.md regla 10 pide poder deshacer: queda para F2-03).
  _Pendiente (partido a propósito):_ numeración editable (hoy es `capítulo.rubro` calculada; requiere columna y migración) y «Guardar como bloque» (F2-01).

- [x] **F1-05** · Exportar Excel · M · F1-04
  **Leer:** producto/excel.md, INDICE (1855–2069). `packages/excel` con ExcelJS, hojas y
  fórmulas entre hojas con valor en caché.
  **Hecho cuando:** LibreOffice recalcula el archivo exportado y da el mismo total que el motor.
  _Medido:_ `exportarLibro` (`packages/excel`) escribe 7 hojas fijas + una `APU <código>` por APU usado; 3 pruebas de excel (incluye recálculo con `soffice` sin valores en caché: subtotal, costo directo y total iguales al motor al centavo), 1 de API (`GET /api/ofertas/:id/exportar`, cualquier rol, sin licencia), e2e `exportar` verde. Botón «Exportar a Excel» en la cabecera del presupuesto.
  _Decisión:_ en ofertas públicas, CPC/origen/VAE viven por rubro (no por material): van en `Presupuesto` (CPC en la col. C, «P / ND / I» y «VAE» en T y U), no en `Materiales`. «Precio referencial» queda vacío (no hay dato). F1-06 debe leer esa forma.

- [x] **F1-06** · Importar libro completo · M · F1-05
  **Leer:** producto/excel.md (importar), INDICE (2153–2262). Subir → Revisar → Confirmar,
  detección por encabezados, reporte de problemas por hoja y fila.
  **Hecho cuando:** importar el Excel exportado en F1-05 reproduce la oferta idéntica (ida y vuelta).
  _Medido:_ `leerLibro` (`packages/excel/src/importar`) lee por encabezados y devuelve `LibroEntrada` + caché + problemas por hoja y fila; ida y vuelta con el fixture (público y privado) da el mismo total al centavo (3 pruebas de excel). API: `POST /api/importar/revisar` y `/confirmar` (cuerpo binario, sin dependencia nueva; 4 pruebas, incluye exportar la oferta importada y comparar total); pantalla `/importar` en 3 pasos; e2e `importar` verde.
  _Decisión:_ los insumos existentes (mismo tipo y descripción) se reutilizan y su precio **no** se pisa (se avisa; actualizar precios es F2-05); los APU se crean siempre nuevos; factor/IVA/herramienta menor del libro no cambian la configuración de la empresa (se avisa si difieren). El export no trae códigos de insumo: se generan (`MAT-0001`…). F1-07 usa `cache` de `LibroLeido`.

- [x] **F1-07** · Comprobación "Cuadra con su Excel" · S · F1-06
  Compara total en caché del libro vs motor; si difiere, lista rubros con diferencia.
  **Hecho cuando:** e2e `cuadra.spec.ts` muestra "✓ Cuadra" con el fixture.
  _Medido:_ `comprobarCuadra` (`packages/excel/src/importar/cuadra.ts`) compara el caché del libro con el motor (total y por rubro, tolerancia 0,005); `POST /api/importar/revisar` devuelve `cuadra`; en el paso Revisar sale «✓ Cuadra con su Excel: $ X = $ X» o, si no, los rubros que difieren. 1 prueba de excel, 1 aserción de API, e2e `cuadra` verde (suite e2e 16/16).

## F2 · Velocidad (momentos: "una bahía, un clic" y "todo se actualiza")

- [x] **F2-01** · Bloques de rubros · M · F1-04
  **Leer:** INDICE (786–809, 1197–1217). Crear bloque desde un capítulo, insertar bloque en una
  oferta (crea capítulo), editar cantidades después. Aviso con subtotal y rubros agregados.
  **Hecho cuando:** e2e añade "Bahía de 230 kV" y ve el aviso con su subtotal.
  _Medido:_ 4 pruebas de API nuevas (guardar capítulo como bloque, insertar con sufijo «(2)», 403/404, borrar con 409 y bitácora; 49 en total), 1 de web (costo directo del bloque con el motor), e2e `bloques` verde (17 en total; sale solo del paquete el fallo intermitente de materiales/listas). Sin migración: `bloque` y `linea_bloque` ya existían. Pantalla `/bloques` (tarjetas con costo directo, «Añadir a la oferta» con aviso de rubros y subtotal ofertado) y «Guardar como bloque» en el presupuesto. Semilla propia: `pnpm --filter api db:seed-bloques` (`BLQ-E2E*`).
  _Decisión:_ insertar un bloque no sube la `version` de la oferta (igual que añadir capítulo); la tarjeta muestra costo directo (los indirectos son de cada oferta). Pendiente: editar el nombre de un bloque ya guardado.

- [x] **F2-02** · Panel de impacto en cambios de precio · M · F1-02, F0-04
  **Leer:** modelo-calculo.md (impacto), ux.md (regla 2), INDICE (1061–1071, 1380–1403).
  **Hecho cuando:** e2e cambia el cobre y ve "Afectó N APUs, M rubros, +$ X" y "Ver qué cambió".
  _Medido:_ 3 pruebas de API nuevas (`GET /api/insumos/:id/impacto`: suma sobre varias ofertas, insumo sin uso, 404/400; 52 en total), 1 de web del panel (20 en total), e2e `impacto` verde (18 en total). Panel `PanelImpacto.tsx` en las cuatro listas. Semilla propia: `pnpm --filter api db:seed-impacto` (`IMP-E2E*`, oferta `OFE-IMP`).
  _Decisión:_ el impacto se calcula en el servidor sobre todas las ofertas (D8); el cliente pide `puAnterior`. Pendiente: impacto al cambiar un APU (no solo un precio).

- [x] **F2-03** · Deshacer e historial de precios · S · F2-02
  Deshacer el último cambio (Ctrl+Z y botón), historial por insumo con fecha y usuario.
  **Hecho cuando:** deshacer devuelve el total exacto anterior.
  _Medido:_ 3 pruebas de API nuevas (`GET /api/insumos/:id/historial`, deshacer = PATCH con el PU anterior; 55 en total), 1 de web (21 en total), e2e `deshacer` verde (19 en total): Deshacer por botón y Ctrl+Z devuelven $ 10,00 y Alt+H lista los 4 cambios. Semilla propia: `pnpm --filter api db:seed-deshacer` (`DES-E2E*`, oferta `OFE-DES`).
  _Pendiente:_ deshacer cambios de APU y quitar rubros/capítulos (ux.md regla 10).

- [x] **F2-04** · Indirectos, utilidad e IVA por oferta · S · F1-04
  **Leer:** INDICE (1126–1144). **Hecho cuando:** cambiar utilidad cambia todos los P.U. ofertados.
  _Medido:_ 2 pruebas de API nuevas (`PATCH /api/ofertas/:id/indirectos/:indId` con bitácora, 409 y rol; IVA por oferta vía `oferta.iva`, null = el de la empresa; 57 en total), 1 de web (22 en total), e2e `indirectos` verde (20 en total): utilidad 10 → 20 % lleva el subtotal de $ 22,00 a $ 24,00 y persiste. Semilla propia: `pnpm --filter api db:seed-indirectos` (`IND-E2E*`). Panel «Indirectos y utilidad» en la oferta.

- [x] **F2-05** · Importar solo precios · S · F2-02, F1-06
  Actualizar una lista desde Excel/CSV con vista previa y panel de impacto al confirmar.
  **Hecho cuando:** e2e sube una hoja Materiales y ve qué precios cambian antes de confirmar.
  _Medido:_ 3 pruebas de excel (`leerPrecios`; 11 en total), 3 de API (`/api/importar/precios/revisar|confirmar`: cambia / sin cambio / no existe, impacto conjunto, historial, 422 sin cambios, 400, 403; 60 en total), 2 de web (24 en total), e2e `importar-precios` verde (21 en total; siguen intermitentes `listas`/`materiales` por semillas en paralelo). Pantalla `/importar/precios` (enlace desde Importar libro). Sin semilla: el e2e arma su libro con prefijo `IPRE2E`.
  _Decisión:_ se empareja por tipo + descripción; lo que no existe se informa y se omite (no crea insumos); confirmar aplica todo en una transacción por `editarTx` (historial y bitácora por insumo). Solo `.xlsx` (CSV pendiente). _Pendiente:_ deshacer en bloque una importación de precios y emparejar por código.

- [x] **F2-06** · APU compartido vs copia en la oferta · S · F1-03
  **Leer:** dominio.md (decisiones). Al editar un APU desde una oferta preguntar el alcance.
  **Hecho cuando:** test de ambos caminos.
  _Medido:_ 3 pruebas de API nuevas (uso + editar compartido; copia «solo esta» con sufijo `(2)`/`(3)`, bitácora y otra oferta intacta; 409/404/403/400; 63 en total), e2e `apu-alcance` verde (22 en total; `materiales` 2.000 filas falla también sin este cambio). Diálogo `EditarApu.tsx` (doble clic o Alt+A en el presupuesto). Semilla propia: `pnpm --filter api db:seed-alcance` (`ALC-E2E*`).
  _Decisión:_ D9. _Pendiente:_ aviso de uso al editar desde `/apus/:id` directo; deshacer la copia.

## F3 · Ganar (momento: "llegamos al objetivo")

- [x] **F3-01** · Costo objetivo y brecha · S · F0-04, F1-04
  **Leer:** INDICE (857–861, 1145–1196). Brecha en la barra de totales (rojo/verde), rubros que
  más pesan con enlace a su APU. **Hecho cuando:** e2e de la misión 5 del prototipo.
  _Medido:_ 1 prueba de API nueva (65 en total), 1 de web (BarraTotales), e2e `objetivo` verde (23 en total; `materiales` 2.000 filas falla también sin este cambio). Panel `Objetivo.tsx` (botón «Costo objetivo» en el presupuesto), brecha en la barra de totales. Semilla propia: `pnpm --filter api db:seed-objetivo` (`OBJ-E2E*`).

- [x] **F3-02** · Versiones y comparación · M · F3-01
  Guardar versión (snapshot), comparar actual vs versión por capítulo y rubro.
  **Hecho cuando:** comparar muestra diferencias por rubro y el total de cada una.
  _Medido:_ 2 pruebas de API nuevas (66 en total), 3 de web (`comparar`), 2 del motor (`calcularDetalle`), e2e `versiones` verde (24 en total; `materiales` 2.000 filas falla también sin este cambio). Panel `Versiones.tsx` (botón «Versiones» en el presupuesto). Semilla propia: `pnpm --filter api db:seed-version` (`VER-E2E*`).
  _Decisión:_ D10.

- [x] **F3-03** · Emitir oferta · S · F3-02
  Congela una versión emitida; la oferta sigue editable como borrador nuevo.
  **Hecho cuando:** cambiar un precio después no altera la versión emitida.
  _Medido:_ 1 prueba de API nueva (67 en total), e2e `emitir` verde (25 en total; `materiales` 2.000 filas falla también sin este cambio). Botón «Emitir oferta» en el panel Versiones. Semilla `pnpm --filter api db:seed-version EMI` (prefijo por argumento).
  _Decisión:_ D11.

## F4 · Equipo (momento: "trabajamos los tres a la vez")

- [x] **F4-01** · Usuarios, roles y disciplinas · M · F0-06
  Admin crea usuarios, asigna rol y disciplinas; disciplinas configurables con color.
  **Hecho cuando:** un cotizador Civil no puede editar rubros Eléctricos (si se configura).
  _Medido:_ 4 pruebas de API nuevas (71 en total, estables en 3 corridas), e2e `usuarios` verde. Pantalla «Usuarios» (solo admin) con disciplinas y color. Se acotó la expiración de sesiones en `auth/rutas.test.ts` (afectaba a otros archivos en paralelo).
  _Decisión:_ D12.

- [x] **F4-02** · Bitácora · S · F4-01
  Toda escritura registra quién, qué, antes, después. Pantalla Historial con filtros.
  **Hecho cuando:** test de que cada endpoint de escritura deja registro.
  _Medido:_ `bitacora/escrituras.test.ts` enumera las rutas de escritura (hook `onRoute`) y falla si una no está cubierta; no hubo huecos. `GET /api/bitacora` (filtros entidad/usuario/fechas, paginación) y pantalla Historial; 6 pruebas de API nuevas (77 en total), e2e `historial` verde. `materiales.spec.ts` (2.000 filas) falla desde antes de este ticket, con la BD actual.

- [x] **F4-03** · Tiempo real (SSE) y conflictos · M · F4-02
  **Leer:** arquitectura.md (tiempo real). NOTIFY/SSE, aplicar cambios remotos, 409 con aviso.
  **Hecho cuando:** e2e con dos navegadores: un cambio aparece en el otro en < 1 s.
  _Medido:_ e2e `tiempo-real` verde con timeout de 1 s (pasa en ~1,5 s total); 2 pruebas de API nuevas (79 en total). Trigger en `bitacora` (migración 0004) → `LISTEN cambios` → `GET /api/ofertas/:id/eventos`. _Pendiente:_ el 409 sigue sin nombrar a quien cambió ni ofrece «quedarse con uno u otro»; la pantalla se refresca sola, lo que reduce los 409.

- [x] **F4-04** · Presencia · S · F4-03
  "Ana (Eléctrico) está en el capítulo 3"; celdas cambiadas por otros destellan.
  **Hecho cuando:** e2e con dos sesiones ve la presencia.
  _Medido:_ e2e `presencia` verde (dos sesiones ven «Ana Presencia está en el capítulo «Obra civil»»); 1 prueba de API nueva (80 en total). Latido `POST /api/ofertas/:id/presencia` en memoria, difundido por el mismo SSE (evento `presencia`). _Pendiente:_ las celdas cambiadas por otros aún no destellan.

## F5 · Vendible (momento: "esto me ahorró N horas")

- [x] **F5-01** · Licencia · M · F4-01
  **Leer:** arquitectura.md (licencias). Validación Ed25519, avisos, gracia, solo lectura,
  límite de usuarios, pantalla Configuración › Licencia. Clave privada de prueba solo en tests.
  **Hecho cuando:** tests de vigente, por vencer, en gracia, vencida (exportar sigue funcionando).
  _Medido:_ 89 pruebas de API verdes (+10: firma, estados por fecha en los límites 10/15 días, límite de usuarios, solo lectura 403, exportar 200) y e2e `licencia` verde. Sin licencia = modo desarrollo salvo `LICENCIA_OBLIGATORIA=1`. _Pendiente:_ la clave pública embebida es de ejemplo; se reemplaza por la real (o `LICENCIA_CLAVE_PUBLICA`) al armar `emitir-licencia`.

- [x] **F5-02** · Empresa demo y misiones guiadas · M · F2-01, F3-01
  **Leer:** ux.md (regla 9), INDICE (1241–1364). Cargar la empresa demo y las 7 misiones con la
  barra guía. **Hecho cuando:** e2e recorre las 7 misiones con un único objetivo resaltado por paso.
  _Medido:_ e2e `misiones` verde (7 misiones, 1 solo `.guia-objetivo` por paso; estable 3/3 en la suite completa), 1 prueba de API nueva (90 en total), 4 de web (32 en total). `POST /api/demo/cargar` (admin, idempotente) importa el fixture como oferta + 4 bloques; `GET /api/demo` da su id. Barra guía en `apps/web/src/misiones/` (avance por escrituras reales de `api()`, clics y pantalla). _Pendiente:_ misión 6 sin simulador (usa el Historial real); el avance de misiones vive en `localStorage` (D13). `materiales` 2.000 filas y `presupuesto-rubros` fallan también sin este cambio.

- [x] **F5-03** · Prueba de volumen · S · F4-03
  Generador de oferta de 5.000 rubros; medir recálculo, scroll y guardado.
  **Hecho cuando:** recálculo < 300 ms en navegador y scroll sin saltos; cifras en este ticket.
  _Medido:_ e2e `volumen` verde con 5.000 rubros (`pnpm --filter api db:seed-volumen-oferta`, prefijo `OFE-VOL`): recálculo al editar una cantidad 84 ms (umbral 300), scroll de 80.000 px con peor cuadro 33 ms y 44 filas en el DOM (virtualizado), guardado PATCH + recarga correctos.

- [x] **F5-04** · Panel de valor · M · F4-02
  **Leer:** ux.md (panel de valor). Métricas del mes desde la bitácora, horas ahorradas con
  fórmula editable, resumen PDF de una página. **Hecho cuando:** e2e ve cifras tras usar la demo.
  _Medido:_ e2e `valor` verde (cifras > 0 tras demo + bloque + emisión; al poner los minutos en 0 las horas pasan a 0 h; abre `/resumen`), 1 prueba de API nueva (91 en total), 1 de web (33). `GET /api/valor?mes=` y `PUT /api/valor/parametros` (admin); panel en Inicio (`PanelValor.tsx`). _Pendiente:_ el PDF es la impresión del navegador (D14); `materiales` (2) y `tiempo-real` (presencia) fallan intermitentes también sin este cambio.

- [x] **F5-05** · Configuración de empresa y país · S · F4-01
  Logo, color de acento, IVA, moneda, formato numérico, disciplinas, tipo público/privado.
  **Hecho cuando:** cambiar IVA a 18 % (Perú) recalcula el total.
  _Medido:_ e2e `empresa` verde (oferta de $ 10,00: total $ 11,50 con 15 % → $ 11,80 con 18 %, persiste tras recargar, restaura al final), 1 prueba de API nueva (92 en total), 1 de web (34). `GET/PUT /api/empresa` (PUT solo admin, bitácora por campo, 409 por `version`); pantalla Configuración › Empresa. Las disciplinas siguen en Usuarios (ya existían). _Pendiente:_ `materiales` (2.000 filas) falla también sin este cambio.

- [x] **F5-08** · Sistema de diseño y armazón · M · F5-05
  **Leer:** producto/ux.md (Estilo visual). shadcn/ui en `apps/web/src/ui/` + `lucide-react` +
  Inter local; tokens en `index.css` con `--acento` → `--primary`; navegación lateral agrupada
  con íconos; barra de totales con el total destacado; login con marca; botones de
  `AvisoLicencia`, `BarraGuia` y `PanelImpacto` desde `ui/`.
  **Hecho cuando:** a 1366×768 la navegación no parte ningún texto, el total se lee en 18px y los
  e2e `login`, `misiones`, `empresa` y `valor` pasan.
  _Medido:_ revisado a 1366×768 (navegación sin cortes, total de 18px, Inicio sin tarjetas
  cortadas); e2e `login`, `misiones`, `valor`, `impacto`, `indirectos` y `empresa` verdes (suite
  completa: 33 de 34 en serie; `materiales` 2.000 filas sigue fallando como antes); 34 pruebas de
  web. `ui/` con `button`, `input`, `label`, `badge`, `card` (diálogo, pestañas y toasts entran en
  F5-09 cuando una pantalla los use). Acento por defecto `#2563eb` (D16). _Pendiente:_ el error
  de ruta de TanStack sale en inglés («Something went wrong!»): darle pantalla propia en F5-10.

- [x] **F5-09** · Pantallas núcleo premium · M · F5-08
  **Leer:** producto/ux.md (reglas 1–5). Presupuesto con encabezado en dos niveles y pestañas
  (Indirectos, Costo objetivo, Versiones); `TablaEditable` con encabezado pegajoso, hover, foco
  con acento y números tabulares; APU con componentes con ícono y pie de cálculo destacado;
  barra de Listas de precios con buscador, contador y atajos en tooltip; panel de impacto flotante.
  **Hecho cuando:** a 1366×768 el Presupuesto no tiene scroll horizontal ni botones cortados y
  los e2e `presupuesto`, `apu`, `materiales`, `impacto` y `volumen` pasan.
  _Medido:_ a 1366×768 la oferta pública (10 columnas) mide 1.062 px de grid sin scroll horizontal
  (`scrollWidth === clientWidth`), ningún botón ni encabezado cortado; e2e del ticket verdes y suite
  completa 34/34 (en paralelo `materiales`, `presencia` y `tiempo-real` fallan a veces; en serie
  pasan); 34 pruebas de web. `ui/` suma `tabs`, `tooltip` y `Card asChild`. Indirectos, Costo
  objetivo y Versiones son pestañas junto a «Rubros» (reemplazan a la tabla, no se apilan).
  `materiales` (2.000 filas) se acota a su semilla con el buscador: otros e2e dejan materiales que
  se ordenan después de `VOL-2000`.

- [x] **F5-10** · Resto de pantallas y detalles · S · F5-09
  **Leer:** producto/ux.md (reglas 8–9). Inicio con KPIs destacados; Ofertas como tabla con
  buscador, total y estado; Historial legible (hoy muestra `[object Object]` en
  `parametrosValor`: `historialTexto.ts`); Bloques, Usuarios, Empresa, Licencia, Importar y
  Papelera desde `ui/`; estados vacíos y de carga.
  **Hecho cuando:** ninguna fila del Historial muestra `[object Object]` (e2e `historial`) y la
  suite e2e completa pasa.
  _Medido:_ e2e `historial` (nuevo caso: reescribe los minutos de ahorro y ninguna fila muestra
  `[object Object]`) y `ofertas` (nuevo) verdes; suite completa 36/36 en serie (en paralelo fallan
  a veces `materiales`, `impacto`, `misiones`… por semillas; en serie pasan); 38 pruebas de web, 92
  de API. `GET /api/ofertas` trae `total` (motor, en pocas consultas: `ofertas/totales.ts`): 206
  ofertas / 6.624 rubros en ~0,45 s. El Historial también leía «— → —» en los cambios de Empresa
  (guardan `{ [campo]: v }`, no `{ valor }`). `ui/` suma `estado` (Cargando, Vacio), `select` y
  `cifra`; el error y el 404 de ruta tienen pantalla propia en español (`ErrorRuta.tsx`). Usuarios
  se dividió (`UsuarioFormulario.tsx`). _Pendiente:_ quedan botones sueltos en pantallas fuera del
  ticket (Apus, HerramientaMenor, FormularioInsumo, ResumenMensual, PanelImpacto y paneles del
  presupuesto).

- [x] **F5-06** · Instalador y respaldos · M · F5-01
  **Leer:** arquitectura.md (despliegue). Dockerfile, compose, Caddy, `instalar.sh`, respaldo
  diario con rotación, `restaurar.sh`. **Hecho cuando:** instalación limpia en una VM Ubuntu LTS
  y restauración de un respaldo probadas, pasos en `deploy/LEEME.md`.
  _Medido:_ probado en Docker local (`instalar.sh` desde cero con imagen construida, login vía Caddy con
  TLS interno, respaldo, borrado de usuarios y `restaurar.sh` → login de vuelta); API 93 pruebas verdes.
  _Pendiente:_ repetirlo en una VM Ubuntu LTS real antes de entregar a SEDEMI (no hay VM en este equipo).

- [x] **F5-07** · Manual de usuario y guía de implementación · S · F5-06
  Guía corta por rol y checklist de implementación (importar libros, bloques, usuarios).
  **Hecho cuando:** existe `docs/manual/` y la checklist se usó en la instalación de SEDEMI.
  _Medido:_ `docs/manual/` con guías por rol y `checklist-implementacion.md`.
  _Pendiente:_ usar la checklist en la instalación real de SEDEMI.

## F6 · Crecer (no entra en la entrega a SEDEMI)

- [ ] **F6-01** · Especificación base paramétrica (pedido de SEDEMI: potencia, tamaño).
- [ ] **F6-02** · Biblioteca de APUs base por sector (para acortar la implementación de nuevos clientes).
- [ ] **F6-03** · Cotizaciones de proveedores: comparar y aplicar precios.
- [ ] **F6-04** · Perfiles de importación para libros con otra estructura.

## Extras pedidos por clientes

(Agregar aquí con etiqueta `[SEDEMI-extra]` u otra; no se mezclan con F0–F5.)
