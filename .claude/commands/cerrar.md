---
description: Verifica y cierra el ticket en curso
---
1. Corre `pnpm typecheck && pnpm lint` y las pruebas de los paquetes tocados. Si el ticket
   tocó UI, corre su spec de Playwright. Corrige lo que falle.
2. Comprueba el criterio **Hecho cuando** del ticket `[~]` con un comando y muestra la salida.
3. Revisa contra `docs/producto/ux.md` si el ticket tocó pantallas: ¿se ve el valor?
4. En `docs/BACKLOG.md` marca el ticket `[x]` y anota cifras medidas si las hubo.
5. Si descubriste algo durable, agrégalo a `CLAUDE.md` o al doc temático (1–2 líneas).
6. Haz commit con mensaje `<ID>: <qué cambió>` en español.
7. Termina diciendo cuál es el siguiente ticket y recuerda usar `/clear` antes de `/siguiente`.
