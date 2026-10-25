# CLAUDE.md

APUflow: sistema web de presupuestos con APUs (análisis de precios unitarios) que
**Corporación Turingtech** vende por licencia mensual. Primer cliente: SEDEMI (subestaciones
eléctricas, Ecuador). Todo el producto, la UI, los docs y los nombres del dominio van en
**español**.

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
pnpm --filter api db:migrate      # migraciones Drizzle
```

Este equipo **no trae `node`** instalado: se instala en F0-01 con `fnm` (Node 22 LTS) y
`corepack enable pnpm`. En sesiones de Claude, el hook `scripts/claude-env.sh` (SessionStart,
en `.claude/settings.json`) agrega node/pnpm al PATH aunque el `HOME` de la cuenta sea otro.
En una terminal propia, si `pnpm` no aparece: `eval "$(fnm env)"`.
TypeScript va fijado en 6.x: typescript-eslint aún no soporta TS 7.

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
- **Patrón de referencia:** el módulo y la tabla de Materiales (F1-01) son el molde. Para
  Equipos, Mano de obra, Transporte y cualquier CRUD nuevo, copiar ese molde, no rediseñar.
- Comentarios solo cuando el porqué no es obvio (p. ej. el orden del redondeo).

## Flujo de trabajo (para gastar pocos tokens)

- **Modelo:** Sonnet 5.5 para implementar. Subagentes de exploración con Haiku 5.5. No
  lanzar subagentes para lo que se resuelve con un `grep`.
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
