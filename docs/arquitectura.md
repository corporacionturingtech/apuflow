# Arquitectura

## Estructura del monorepo (pnpm workspaces)

```
apuflow/
├── packages/
│   ├── motor/        Cálculo puro en TS + decimal.js. Sin React, sin BD, sin red.
│   │   ├── src/      tipos.ts · redondeo.ts · apu.ts · oferta.ts · impacto.ts · objetivo.ts
│   │   └── test/     paridad.test.ts (contra el prototipo) · fixtures/sedemi-demo.json
│   ├── excel/        Importar/exportar .xlsx con ExcelJS. Usa motor para los valores en caché.
│   └── tipos/        Esquemas zod compartidos API ↔ web (DTOs). Un solo lugar para validar.
├── apps/
│   ├── api/          Fastify + Drizzle ORM + PostgreSQL 16
│   │   ├── src/modulos/<modulo>/   rutas.ts · servicio.ts · repo.ts · *.test.ts
│   │   ├── src/db/                 esquema.ts · migraciones/ (drizzle-kit)
│   │   ├── src/licencia/           validación del archivo de licencia
│   │   └── src/tiempo-real/        LISTEN/NOTIFY → SSE
│   └── web/          Vite + React 19 + TanStack Router/Query/Table/Virtual + Tailwind + shadcn/ui
│       └── src/      rutas/ · componentes/ · funciones/ (hooks) · ui/ (shadcn)
├── e2e/              Playwright: un spec por momento de valor
├── deploy/           docker-compose.yml · Caddyfile · respaldo.sh · instalar.sh
└── docs/  referencia/  .claude/
```

Regla de dependencias: `web → tipos, motor` · `api → tipos, motor, excel` · `excel → motor` ·
`motor → (nada)`. Nunca al revés.

## Datos (PostgreSQL)

- Tablas en español y snake_case: `insumo`, `historial_precio`, `apu`, `linea_apu`, `bloque`,
  `linea_bloque`, `oferta`, `capitulo`, `rubro`, `indirecto`, `version_oferta`, `usuario`,
  `bitacora`, `config_empresa`, `licencia`.
- Importes y cantidades: `numeric(18,6)` para precios/cantidades de entrada, `numeric(18,2)`
  para resultados guardados. Nunca `float`/`real`.
- Cada tabla editable tiene `version int` (bloqueo optimista) y `actualizado_por`,
  `actualizado_en`.
- **Los totales no se guardan como fuente de verdad**: se recalculan con el motor. Solo se
  guardan dentro de un snapshot de versión emitida.
- Índices pensados para 10.000 rubros por oferta (`rubro(oferta_id, capitulo_id, orden)`).

## Cálculo

- El navegador carga la oferta completa (insumos + APUs + rubros) y calcula con `motor`:
  respuesta instantánea al editar.
- La API recalcula con el mismo `motor` al emitir, exportar y en el panel de valor.
- La API manda **cambios**, no totales; el cliente recalcula.

## Tiempo real (varias disciplinas a la vez)

- Un trigger en `bitacora` (migración 0004) hace `pg_notify('cambios', {entidad, entidadId, campo, usuarioId, fecha})`: cubre toda escritura. El canal es global (no por oferta); el filtro lo hace el cliente, que ignora sus propios cambios y refetch la oferta. `pg_notify` solo sale al commit.
- La API mantiene un `LISTEN` y reenvía por **SSE** (`GET /api/ofertas/:id/eventos`) a los
  navegadores de esa oferta. Sin WebSocket ni Redis: menos piezas para instalar on-premise.
- Conflictos: si `version` no coincide, la API devuelve 409 con el valor actual; la UI muestra
  "Carlos cambió esta celda hace un momento" y ofrece quedarse con uno u otro.
- Presencia: latido cada 20 s (`POST /presencia`), en memoria del proceso de la API.

## Autenticación y permisos

- Usuario y clave (argon2), sesión en cookie httpOnly. Sin proveedores externos (on-premise
  sin internet debe funcionar).
- Roles: `admin` (usuarios, licencia, configuración), `precios` (edita listas y APUs),
  `cotizador` (edita ofertas, solo rubros de sus disciplinas si así se configura: `ajustes.restringirPorDisciplina`, ver D12), `lector`.
- Sesiones en la tabla `sesion` (guarda el sha256 del token, 8 h); desactivar un usuario las invalida. Primer admin: `ADMIN_USUARIO=… ADMIN_CLAVE=… pnpm --filter api db:seed`.
- Límite de usuarios activos según la licencia.

## Licencias

- Archivo `licencia.json` = `{ cliente, plan, maxUsuarios, modulos[], emitida, vence, instalacion }`
  + firma Ed25519. La clave pública va embebida en la API; la privada **nunca** entra a este repo.
- Emisión: script aparte `herramientas/emitir-licencia` en un repo privado de Turingtech
  (o en la máquina del socio), no aquí.
- La API valida al arrancar y cada 24 h:
  - vigente → normal; ≤ 10 días para vencer → aviso al admin;
  - vencida → 15 días de gracia con aviso → **modo solo lectura** (ver y exportar, no editar).
- Variables: `LICENCIA_CLAVE_PUBLICA` (PEM, reemplaza la embebida) y `LICENCIA_OBLIGATORIA=1` (sin licencia cargada → solo lectura; sin ella la instalación corre en modo desarrollo). El hook de solo lectura bloquea todo método no-GET salvo `/api/auth/*` y `/api/licencia*`, por eso exportar (GET) sigue andando.
- Sin conexión obligatoria. En instancias gestionadas por Turingtech la renovación copia el
  archivo nuevo; on-premise, el admin lo sube en Configuración › Licencia.
- `instalacion` = ID generado en la primera instalación, para que una licencia no se copie a
  otra instalación.

## Despliegue (igual en el servidor del cliente y en el de Turingtech)

- `deploy/docker-compose.yml`: `apuflow` (API que también sirve el build de web), `postgres`,
  `caddy` (HTTPS automático o certificado interno), `respaldo` (pg_dump diario, 14 rotaciones).
- `deploy/instalar.sh`: pide dominio/IP, genera secretos, levanta el stack, crea el admin.
- Actualizaciones: imagen versionada (`apuflow:1.4.2`), migraciones automáticas al arrancar.
- Turingtech gestionado: un stack por cliente en un VPS, cada uno con su base. Sin
  multi-empresa en una misma base (aislamiento simple, mismo código que on-premise).
- Telemetría: ninguna por defecto. El panel de valor se calcula local.

## Pruebas

- `motor`: Vitest, paridad con el prototipo, casos borde de redondeo. Cobertura alta.
- `api`: Vitest + Postgres real en Docker (testcontainers o un `docker compose -f test`).
- `web`: pocas pruebas de componentes; el peso está en **Playwright** (`e2e/`), un spec por
  momento de valor (`ux.md`), con aserciones de texto.
- Volumen: script que genera una oferta de 5.000 rubros; medir recálculo y scroll.
