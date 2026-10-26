---
description: Ticket completo: toma el siguiente, lo implementa y lo cierra de una vez
---
Haz un ticket completo en una sola pasada, sin pedir confirmación entre pasos.

1. Ejecuta el procedimiento de `.claude/commands/siguiente.md` (ticket indicado: $ARGUMENTS;
   si está vacío, el primer `[ ]` con dependencias hechas). Implementa.
2. Ejecuta el procedimiento de `.claude/commands/cerrar.md` completo (verificación, BACKLOG,
   commit).
3. Deténte y avisa **antes de cerrar** solo si: el ticket es más grande que su tamaño y hay que
   partirlo, el criterio **Hecho cuando** no se puede cumplir, o algo falla y no logras
   corregirlo. No hagas commit de un ticket que no cumple su criterio.
4. Termina con 2 líneas: qué quedó hecho y cuál es el siguiente ticket. Recuerda al usuario
   usar `/clear` antes del próximo `/ticket`.
