---
description: Toma el próximo ticket del backlog y prepara su implementación
---
1. Lee `docs/BACKLOG.md` y elige el primer ticket `[ ]` cuyas dependencias estén en `[x]`
   (o el ticket que indique el usuario: $ARGUMENTS). Márcalo `[~]`.
2. Lee **solo** los documentos de su campo **Leer** y, si menciona líneas del prototipo, solo
   ese rango con `sed -n`. No explores el repo más allá de los archivos que vas a tocar.
3. Escribe en 5–10 líneas: archivos a crear o editar, pruebas que vas a escribir y cómo vas a
   comprobar el criterio **Hecho cuando**. Si el ticket es más grande que su tamaño, propón
   partirlo antes de empezar.
4. Implementa empezando por las pruebas cuando el ticket toca `packages/motor` o la API.
