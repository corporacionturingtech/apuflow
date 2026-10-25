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

- [ ] **F0-08** · CI · S · F0-07
  GitHub Actions: typecheck, lint, test, e2e. **Hecho cuando:** pipeline verde.

## F1 · Su Excel adentro (momento: "cuadra")

- [ ] **F1-01** · Listas de precios: Materiales (patrón de referencia) · M · F0-07
  **Leer:** dominio.md, ux.md (reglas 2–4). CRUD API + tabla tipo Excel virtualizada con edición
  por teclado, FACTOR, precio referencial, secciones por disciplina, búsqueda.
  **Este ticket define el patrón** (módulo API + tabla editable) que copian los siguientes.
  **Hecho cuando:** e2e edita un precio con teclado y persiste; 2.000 filas fluidas.

- [ ] **F1-02** · Equipos, Mano de obra, Transporte · S · F1-01
  Copiar el patrón de F1-01 (no rediseñar). Herramienta menor en Equipos.
  **Hecho cuando:** las cuatro listas funcionan igual.

- [ ] **F1-03** · Biblioteca de APUs y pantalla APU · M · F1-02
  **Leer:** ux.md (regla 5), INDICE (995–1059). Los cuatro componentes en una pantalla,
  rendimiento, agregar/quitar líneas buscando insumos, cálculo al pie con el motor.
  **Hecho cuando:** e2e abre un APU, sube ayudantes de 3 a 4 y el CU cambia como en el prototipo.

- [ ] **F1-04** · Ofertas, capítulos y rubros · M · F1-03
  **Leer:** INDICE (928–994). Lista de ofertas, datos generales, tipo público/privado (columnas
  distintas), capítulos, rubros con cantidad, numeración, tabla virtualizada, barra de totales real.
  **Hecho cuando:** oferta de 1.500 rubros (generada) edita cantidades sin lag.

- [ ] **F1-05** · Exportar Excel · M · F1-04
  **Leer:** producto/excel.md, INDICE (1855–2069). `packages/excel` con ExcelJS, hojas y
  fórmulas entre hojas con valor en caché.
  **Hecho cuando:** LibreOffice recalcula el archivo exportado y da el mismo total que el motor.

- [ ] **F1-06** · Importar libro completo · M · F1-05
  **Leer:** producto/excel.md (importar), INDICE (2153–2262). Subir → Revisar → Confirmar,
  detección por encabezados, reporte de problemas por hoja y fila.
  **Hecho cuando:** importar el Excel exportado en F1-05 reproduce la oferta idéntica (ida y vuelta).

- [ ] **F1-07** · Comprobación "Cuadra con su Excel" · S · F1-06
  Compara total en caché del libro vs motor; si difiere, lista rubros con diferencia.
  **Hecho cuando:** e2e `cuadra.spec.ts` muestra "✓ Cuadra" con el fixture.

## F2 · Velocidad (momentos: "una bahía, un clic" y "todo se actualiza")

- [ ] **F2-01** · Bloques de rubros · M · F1-04
  **Leer:** INDICE (786–809, 1197–1217). Crear bloque desde un capítulo, insertar bloque en una
  oferta (crea capítulo), editar cantidades después. Aviso con subtotal y rubros agregados.
  **Hecho cuando:** e2e añade "Bahía de 230 kV" y ve el aviso con su subtotal.

- [ ] **F2-02** · Panel de impacto en cambios de precio · M · F1-02, F0-04
  **Leer:** modelo-calculo.md (impacto), ux.md (regla 2), INDICE (1061–1071, 1380–1403).
  **Hecho cuando:** e2e cambia el cobre y ve "Afectó N APUs, M rubros, +$ X" y "Ver qué cambió".

- [ ] **F2-03** · Deshacer e historial de precios · S · F2-02
  Deshacer el último cambio (Ctrl+Z y botón), historial por insumo con fecha y usuario.
  **Hecho cuando:** deshacer devuelve el total exacto anterior.

- [ ] **F2-04** · Indirectos, utilidad e IVA por oferta · S · F1-04
  **Leer:** INDICE (1126–1144). **Hecho cuando:** cambiar utilidad cambia todos los P.U. ofertados.

- [ ] **F2-05** · Importar solo precios · S · F2-02, F1-06
  Actualizar una lista desde Excel/CSV con vista previa y panel de impacto al confirmar.
  **Hecho cuando:** e2e sube una hoja Materiales y ve qué precios cambian antes de confirmar.

- [ ] **F2-06** · APU compartido vs copia en la oferta · S · F1-03
  **Leer:** dominio.md (decisiones). Al editar un APU desde una oferta preguntar el alcance.
  **Hecho cuando:** test de ambos caminos.

## F3 · Ganar (momento: "llegamos al objetivo")

- [ ] **F3-01** · Costo objetivo y brecha · S · F0-04, F1-04
  **Leer:** INDICE (857–861, 1145–1196). Brecha en la barra de totales (rojo/verde), rubros que
  más pesan con enlace a su APU. **Hecho cuando:** e2e de la misión 5 del prototipo.

- [ ] **F3-02** · Versiones y comparación · M · F3-01
  Guardar versión (snapshot), comparar actual vs versión por capítulo y rubro.
  **Hecho cuando:** comparar muestra diferencias por rubro y el total de cada una.

- [ ] **F3-03** · Emitir oferta · S · F3-02
  Congela una versión emitida; la oferta sigue editable como borrador nuevo.
  **Hecho cuando:** cambiar un precio después no altera la versión emitida.

## F4 · Equipo (momento: "trabajamos los tres a la vez")

- [ ] **F4-01** · Usuarios, roles y disciplinas · M · F0-06
  Admin crea usuarios, asigna rol y disciplinas; disciplinas configurables con color.
  **Hecho cuando:** un cotizador Civil no puede editar rubros Eléctricos (si se configura).

- [ ] **F4-02** · Bitácora · S · F4-01
  Toda escritura registra quién, qué, antes, después. Pantalla Historial con filtros.
  **Hecho cuando:** test de que cada endpoint de escritura deja registro.

- [ ] **F4-03** · Tiempo real (SSE) y conflictos · M · F4-02
  **Leer:** arquitectura.md (tiempo real). NOTIFY/SSE, aplicar cambios remotos, 409 con aviso.
  **Hecho cuando:** e2e con dos navegadores: un cambio aparece en el otro en < 1 s.

- [ ] **F4-04** · Presencia · S · F4-03
  "Ana (Eléctrico) está en el capítulo 3"; celdas cambiadas por otros destellan.
  **Hecho cuando:** e2e con dos sesiones ve la presencia.

## F5 · Vendible (momento: "esto me ahorró N horas")

- [ ] **F5-01** · Licencia · M · F4-01
  **Leer:** arquitectura.md (licencias). Validación Ed25519, avisos, gracia, solo lectura,
  límite de usuarios, pantalla Configuración › Licencia. Clave privada de prueba solo en tests.
  **Hecho cuando:** tests de vigente, por vencer, en gracia, vencida (exportar sigue funcionando).

- [ ] **F5-02** · Empresa demo y misiones guiadas · M · F2-01, F3-01
  **Leer:** ux.md (regla 9), INDICE (1241–1364). Cargar la empresa demo y las 7 misiones con la
  barra guía. **Hecho cuando:** e2e recorre las 7 misiones con un único objetivo resaltado por paso.

- [ ] **F5-03** · Prueba de volumen · S · F4-03
  Generador de oferta de 5.000 rubros; medir recálculo, scroll y guardado.
  **Hecho cuando:** recálculo < 300 ms en navegador y scroll sin saltos; cifras en este ticket.

- [ ] **F5-04** · Panel de valor · M · F4-02
  **Leer:** ux.md (panel de valor). Métricas del mes desde la bitácora, horas ahorradas con
  fórmula editable, resumen PDF de una página. **Hecho cuando:** e2e ve cifras tras usar la demo.

- [ ] **F5-05** · Configuración de empresa y país · S · F4-01
  Logo, color de acento, IVA, moneda, formato numérico, disciplinas, tipo público/privado.
  **Hecho cuando:** cambiar IVA a 18 % (Perú) recalcula el total.

- [ ] **F5-06** · Instalador y respaldos · M · F5-01
  **Leer:** arquitectura.md (despliegue). Dockerfile, compose, Caddy, `instalar.sh`, respaldo
  diario con rotación, `restaurar.sh`. **Hecho cuando:** instalación limpia en una VM Ubuntu LTS
  y restauración de un respaldo probadas, pasos en `deploy/LEEME.md`.

- [ ] **F5-07** · Manual de usuario y guía de implementación · S · F5-06
  Guía corta por rol y checklist de implementación (importar libros, bloques, usuarios).
  **Hecho cuando:** existe `docs/manual/` y la checklist se usó en la instalación de SEDEMI.

## F6 · Crecer (no entra en la entrega a SEDEMI)

- [ ] **F6-01** · Especificación base paramétrica (pedido de SEDEMI: potencia, tamaño).
- [ ] **F6-02** · Biblioteca de APUs base por sector (para acortar la implementación de nuevos clientes).
- [ ] **F6-03** · Cotizaciones de proveedores: comparar y aplicar precios.
- [ ] **F6-04** · Perfiles de importación para libros con otra estructura.

## Extras pedidos por clientes

(Agregar aquí con etiqueta `[SEDEMI-extra]` u otra; no se mezclan con F0–F5.)
