# CLAUDE.md

Turing APU: sistema web de presupuestos con APUs (análisis de precios unitarios) que
**Corporación Turingtech** vende por licencia mensual. Primer cliente: SEDEMI (subestaciones
eléctricas, Ecuador). Todo el producto, la UI, los docs y los nombres del dominio van en
**español**. El producto se llama «Turing APU» (así, con espacio); los identificadores técnicos
(BD, contenedores, respaldos, claves) conservan `apuflow` (ver D17).

Antes de cualquier cosa: el producto se juzga por dos cosas, **valor percibido** y **UX**.
Una función que funciona pero no se nota no está terminada (ver `docs/producto/ux.md`).

## Dónde está cada cosa (lee solo lo que el ticket pide)

| Necesito… | Leer |
|---|---|
| Qué construir ahora | `docs/BACKLOG.md` (primer `[ ]` con dependencias hechas) |
| Por qué y para quién | `docs/PLAN.md` |
| Términos del negocio y modelo de datos | `docs/producto/dominio.md` |
| Fórmulas y redondeo | `docs/producto/modelo-calculo.md` |
| Reglas de UX y momentos de valor | `docs/producto/ux.md` |
| Formato de Excel (importar/exportar) | `docs/producto/excel.md` |
| Paquetes, BD, tiempo real, licencias, despliegue | `docs/arquitectura.md` |
| Decisiones ya tomadas | `docs/DECISIONES.md` |
| Ícono y marca del producto (Turing APU) | `docs/marca/README.md` |
| Cómo lo hacía el prototipo | `referencia/INDICE.md` → `sed -n A,Bp referencia/prototipo_v2.html` |

## Stack

pnpm workspaces · TypeScript estricto · `packages/motor` (cálculo, decimal.js) ·
`packages/excel` (ExcelJS) · `packages/tipos` (zod) · `apps/api` (Fastify + Drizzle +
PostgreSQL 16) · `apps/web` (Vite + React + TanStack Router/Query/Table/Virtual + Tailwind +
shadcn/ui) · Vitest · Playwright · Docker Compose + Caddy.

## Comandos

```bash
pnpm install
pnpm dev                          # api + web + postgres de desarrollo
pnpm --filter motor test          # pruebas de un paquete (preferir esto a la suite entera)
pnpm typecheck && pnpm lint       # antes de cerrar un ticket
pnpm e2e -- e2e/cuadra.spec.ts    # un solo spec de Playwright
pnpm --filter api db:migrate      # migraciones Drizzle (BD: docker compose -f docker-compose.dev.yml up -d, puerto 5433)
```

Este equipo **no trae `node`** instalado: se instala en F0-01 con `fnm` (Node 22 LTS) y
`corepack enable pnpm`. En sesiones de Claude, el hook `scripts/claude-env.sh` (SessionStart,
en `.claude/settings.json`) agrega node/pnpm al PATH aunque el `HOME` de la cuenta sea otro.
En una terminal propia, si `pnpm` no aparece: `eval "$(fnm env)"`.
e2e (con `--` corre todos los specs, no pasarlo): `pnpm e2e` levanta api+web solo (necesita Postgres dev arriba). Si Playwright no halla Chromium (HOME distinto): `PLAYWRIGHT_BROWSERS_PATH=/home/leonel/.cache/ms-playwright`.
Docker: `pnpm install` falla por scripts de build sin aprobar (pnpm 12); el Dockerfile usa `--config.strictDepBuilds=false`. Probar `deploy/` sin chocar: `COMPOSE_PROJECT_NAME=x DOMINIO=localhost HTTP_PUERTO=8080 HTTPS_PUERTO=8443 ./instalar.sh`.
TypeScript va fijado en 6.x: typescript-eslint aún no soporta TS 7.
No correr `pnpm format` sobre todo el repo: reformatea docs y `referencia/`. Formatear solo los archivos tocados (`pnpm prettier --write <archivos>`).

## Reglas duras

1. **El cálculo vive solo en `packages/motor`.** Web y API lo importan; nadie más multiplica
   precios. Dinero con `decimal.js` en TS y `numeric` en PostgreSQL. Nunca `float`.
2. **Paridad al centavo.** `packages/motor/test/paridad.test.ts` compara con el prototipo.
   Si se rompe, se revierte el cambio, no se ajusta el test.
3. **Dependencias en una sola dirección:** `web → tipos, motor` · `api → tipos, motor, excel` ·
   `excel → motor` · `motor → nada`.
4. **Configuración, no forks.** Lo que pide un cliente se resuelve con configuración de la
   empresa. Prohibido `if (cliente === 'SEDEMI')`.
5. **Toda escritura deja bitácora** (quién, qué, antes, después) y respeta `version` (409 si choca).
6. **Exportar a Excel siempre funciona**, incluso con licencia vencida.
7. **Nada de datos reales de clientes en el repo.** Fixtures ficticios o anonimizados. La clave
   privada de licencias nunca entra aquí.
8. Textos de UI en español, de usted, con el vocabulario de `dominio.md`. Moneda `$ 1.313,64`,
   entrada `10,40` o `10.40`.

## Convenciones de código

- Nombres del dominio en español (`apu`, `rubro`, `insumo`, `calcularOferta`); términos
  técnicos genéricos pueden ir en inglés (`useQuery`, `handler`).
- Módulo API: `apps/api/src/modulos/<modulo>/{rutas,servicio,repo}.ts` + `*.test.ts`.
- Archivos < 300 líneas. Si crece, dividir por responsabilidad.
- Validación con zod en `packages/tipos`; la API valida entrada y salida con el mismo esquema.
- **Patrón de referencia:** el módulo y la tabla de Materiales (F1-01) son el molde; las cuatro listas viven en `pantallas/ListaPrecios.tsx` (config `LISTAS`) y el borrado es lógico (`eliminado_en`, papelera). Para
  Equipos, Mano de obra, Transporte y cualquier CRUD nuevo, copiar ese molde, no rediseñar.
- Comentarios solo cuando el porqué no es obvio (p. ej. el orden del redondeo).
- UI: botones, campos e insignias desde `apps/web/src/ui/` (ver `ux.md` § Estilo visual); no clases sueltas de botón.

## Flujo de trabajo (para gastar pocos tokens)

- **Modelo:** Sonnet 5.5 para implementar. Subagentes de exploración con Haiku 5.5. No
  lanzar subagentes para lo que se resuelve con un `grep`.
- Semillas de e2e: `seed-volumen` borra y recrea los `LST-*` y los e2e corren en paralelo; un e2e que dependa de precios fijos usa su propia semilla con otro prefijo (ver `seed-apu.ts`).
- Mutaciones que quitan una fila del caché (react-query): leer la `version` de la fila antes de quitarla, dentro de `mutationFn` (no en `onMutate`, que corre al encolar); si no, el DELETE nunca sale. El e2e completo tiene fallos intermitentes por semillas en paralelo (materiales/listas); repetir antes de culpar al ticket.
- Importar Excel: la API recibe el .xlsx como cuerpo binario (`application/octet-stream` + `X-Nombre-Archivo`), sin multipart. Un e2e puede armar su libro con `exportarLibro` importando `../packages/excel/src`.
- Semilla de impacto parametrizada por prefijo (`seed-impacto.ts DES`): un e2e nuevo con precios fijos copia ese patrón. Hay dos botones «Deshacer» (papelera y panel de impacto): en e2e acotar por su aviso.
- Tests de API que cambian estado global de la BD (p. ej. licencia, que afecta a todos los archivos en paralelo): correr todo en `db.transaction(async (tx) => { …; throw new Deshacer() })` y pasar `tx as unknown as Bd` a `crearApp` (ver `modulos/licencia/rutas.test.ts`). En una transacción `now()` es fijo: ordenar por fecha exige `new Date()` explícito.
- Trampa de tablas editables: tras guardar, la fila tiene `version` vieja hasta que responde el PATCH; acciones sobre la misma fila (Supr) deben esperar o dan 409 falso.
- e2e: tras el clic de «Ingresar», esperar un elemento de la app (p. ej. el enlace «Ofertas») antes de un `page.goto`; si no, la navegación corta el login y el test falla a veces.
- e2e que usan `seed-rubros` (RUB-E2E): nombrar sus ofertas `OFE-RUB…`; la semilla solo borra esas y, si queda otra oferta con el APU, falla por clave foránea.
- Misiones guiadas: cada elemento objetivo lleva `data-guia="…"` (ver `misiones/misiones.ts`). El e2e `misiones` usa la empresa demo compartida (`/api/demo/cargar`) y al final quita los capítulos que añadió: un rubro ajeno en la demo impide a otras semillas (p. ej. `seed-bloques`) borrar sus APUs. `tsx watch` de un servidor ya levantado puede no recargar rutas nuevas: si `/api/…` da 404, reinícielo antes del e2e.
- Oferta: Indirectos, Costo objetivo y Versiones son pestañas (`role="tab"`) que ocultan la tabla; un e2e que edita la tabla con un panel abierto vuelve antes a la pestaña «Rubros».
- e2e `empresa` y `valor` escriben la misma fila de `config_empresa`: en paralelo `empresa` puede dar 409; repetir solo antes de culpar al ticket.
- **Un ticket por sesión:** `/siguiente` → implementar → `/cerrar` → `/clear`. No arrastrar
  contexto de un ticket al siguiente.
- **Leer lo mínimo:** solo los docs del campo **Leer** del ticket. Nunca abrir
  `referencia/prototipo_v2.html` entero (~70k tokens): usar el rango de `INDICE.md`.
  Para un archivo grande del repo, `grep -n` primero y luego leer el rango.
- **Verificar con texto, no con imágenes:** tests y Playwright con aserciones de texto. Un
  screenshot solo si el ticket es visual y algo no cuadra.
- **Pruebas enfocadas:** correr el paquete o el spec del ticket; la suite completa solo en `/cerrar`.
- **No reescribir archivos enteros** para cambios pequeños: editar el fragmento.
- **Si el ticket crece** más de lo previsto, partirlo en el BACKLOG y cerrar la parte hecha.
- **Si algo de los docs está mal o falta**, corregirlo en el mismo ticket (ver abajo).

## Definición de terminado

1. Criterio **Hecho cuando** del ticket comprobado con un comando.
2. `pnpm typecheck && pnpm lint` y las pruebas del paquete tocado pasan.
3. Si toca UI: cumple las reglas de `ux.md` que apliquen y tiene su e2e.
4. BACKLOG actualizado (`[x]` y, si aplica, cifras medidas).
5. Commit con mensaje en español: `F1-03: pantalla APU con los cuatro componentes`.

## Mantenimiento de este archivo

Cuando un ticket descubra algo durable (una limitación del entorno, una convención, una
trampa de una librería), se agrega en el mismo commit: aquí si aplica a todo el repo, o en el
doc temático si es de un área. Una o dos líneas. Si contradice algo escrito, se corrige lo
viejo. Las decisiones de diseño nuevas van a `docs/DECISIONES.md`. Este archivo debe seguir
siendo corto: lo detallado va en `docs/`.
