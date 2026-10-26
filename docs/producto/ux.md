# UX y valor percibido

APUflow se paga cada mes. El cliente renueva si **ve** el valor cada vez que lo usa, no solo
si el valor existe. Cada pantalla tiene que hacer visible lo que el sistema hizo por él.

## Las 10 reglas (todo ticket de UI las cumple)

1. **El total siempre a la vista.** Barra fija con subtotal, IVA, total y, si hay costo
   objetivo, la brecha en verde/rojo. Tras cada cambio muestra la variación (`+$ 1.240,00`)
   durante unos segundos.
2. **Panel de impacto en cada cambio de precio o APU.** "El cable 2/0 AWG pasó de $ 9,60 a
   $ 10,40. Afectó 4 APUs y 12 rubros. La oferta subió $ 1.240,00. Recalculado en 18 ms."
   Con botones **Ver qué cambió** y **Deshacer**. Es la prueba diaria de que el Excel quedó atrás.
3. **Tabla tipo Excel.** Flechas, Enter, Tab, F2 para editar, Ctrl+Z, pegar un rango desde
   Excel. Números con coma decimal (`10,40`) y formato `$ 1.313,64`. La celda editada a mano
   se marca en amarillo, como en su libro.
4. **Fluida con miles de rubros.** Tabla virtualizada; recálculo de 5.000 rubros < 300 ms;
   nunca bloquear la escritura mientras se guarda (optimista, guardado en segundo plano).
5. **El APU completo en una pantalla.** Equipos, mano de obra, materiales y transporte a la
   vez, con rendimiento, herramienta menor y el cálculo al pie (CU → indirectos → P.U. ofertado).
6. **Primer valor en 10 minutos.** El primer uso es: subir su libro de Excel → ver su oferta
   con **"Cuadra con su Excel: $ 248.310,55 = $ 248.310,55 ✓"**. Si no cuadra, mostrar en qué
   rubro está la diferencia. Sin formulario largo de registro antes de esto.
7. **Presencia y autoría.** "Ana (Eléctrico) está en el capítulo 3". Cada celda cambiada por
   otra persona destella con su color de disciplina. Historial legible: quién, qué, cuándo,
   antes → después, con deshacer.
8. **Lenguaje del cliente.** Rubro, APU, rendimiento, bahía, indirectos. Español neutro, de
   usted. Nada de "entidad", "registro", "sincronizar", "error 500".
9. **Nunca una pantalla vacía.** Empresa demo con datos ficticios y misiones guiadas (las 7
   del prototipo, líneas 1241–1290) hasta que el cliente cargue lo suyo.
10. **Cero callejones sin salida.** Todo se puede deshacer; nada se borra sin papelera;
    exportar a Excel siempre disponible (incluso con licencia vencida).

## Momentos de valor (se diseñan, no salen solos)

| Momento | Qué ve el usuario | Dónde |
|---|---|---|
| "Cuadra" | Su total = el total de su Excel | Importación |
| "Un clic, una bahía" | Bloque de 40 rubros entra a la oferta con su subtotal | Bloques |
| "Cambio un precio y todo se actualiza" | Panel de impacto | Listas de precios, APU |
| "Llegamos al objetivo" | Brecha pasa de rojo a verde con confeti discreto | Costo objetivo |
| "Trabajamos los tres a la vez" | Presencia y celdas que destellan | Presupuesto |
| "Lo mandé en su formato" | Excel exportado con sus hojas y fórmulas | Exportar |

## Panel de valor (lo ve quien paga la licencia)

Pantalla Inicio para el rol admin, con datos reales del uso del mes:
- Ofertas creadas y emitidas; monto total cotizado.
- Rubros recalculados automáticamente por cambios de precio.
- Bloques reutilizados (y rubros que no hubo que copiar a mano).
- Ofertas que llegaron al costo objetivo.
- **Horas ahorradas estimadas**, con la fórmula visible y editable por el cliente
  (p. ej. minutos por rubro copiado a mano × rubros que entraron por bloque). Nunca inflar:
  si el cliente no cree la cifra, se pierde la confianza.
- Un resumen mensual exportable en PDF de una página, para que el comprador lo muestre a
  su gerencia.

## Pantallas (orden de navegación)

Inicio (panel de valor + ofertas recientes) · Ofertas · Oferta › Presupuesto · Oferta › APU ·
Oferta › Indirectos · Oferta › Costo objetivo · Oferta › Versiones · Bloques · Listas de
precios (Materiales, Equipos, Mano de obra, Transporte) · APUs (biblioteca) · Historial ·
Configuración (empresa, disciplinas, usuarios, licencia).

## Estilo visual

- Componentes `shadcn/ui` + Tailwind. Denso como una hoja de cálculo, no "tarjetas grandes".
- Color de marca configurable por empresa (logo y un color de acento). APUflow muestra la
  marca del cliente; la de Turingtech solo en el pie y en el login.
- Colores fijos por disciplina: Civil, Eléctrico, Mecánico (configurables si cambian).
- Probar a 1366×768 (la laptop típica del cliente) y 1920×1080. Móvil: solo consulta.
- Tokens en `apps/web/src/index.css` (`@theme`): `primario` = acento de la empresa, `borde`,
  `fondo`, colores de disciplina. Fuente Inter (local, sin CDN) y cifras con `tabular-nums`.
- Botones, campos, insignias y tarjetas solo desde `apps/web/src/ui/` (`Button`/`variantesBoton`
  con `default` = acción principal, una por zona; `outline` secundarias; `ghost` terciarias y
  «Cerrar»; `destructive` para borrar). Íconos `lucide-react` de 16px con `aria-hidden`.
- Pestañas (`ui/tabs`) y tooltips (`ui/tooltip`) también desde `ui/`. Los atajos de una tabla van
  en `componentes/Atajos` (tooltip), no como texto suelto. En `TablaEditable` una columna
  `flexible` (la descripción) absorbe el ancho: a 1366×768 ninguna tabla tiene scroll horizontal.
- Cargas y listas vacías con `ui/estado` (`Cargando`, `Vacio` con el siguiente paso), selectores con
  `ui/select` y cifras destacadas (KPI) con `ui/cifra`; nunca un «Cargando…» suelto ni una lista en blanco.
- Avisos que no deben empujar la tabla (panel de impacto) flotan sobre la barra de totales.
- Navegación agrupada (trabajo, listas de precios, control, configuración); la página activa
  se marca con una barra de acento. La barra de totales muestra el total en 18px y la variación
  tras cada cambio durante 4 s.
