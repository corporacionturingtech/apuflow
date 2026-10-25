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
