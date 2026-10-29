# Marca del producto

Ícono de **Turing APU** (nombre comercial de APUflow en la familia Turing: Turing APU,
Turing Factura, Turing Dental, Turing Bodega).

| Archivo | Uso |
|---|---|
| `turing_apu_icono.svg` | Tiendas (iOS, Android): cuadrado a sangre, el sistema aplica su máscara |
| `turing_apu_icono_redondeado.svg` | Web, presentaciones, favicon de 32 px o más (radio 22,37 %) |
| `generar_icono.py` | Genera los dos SVG; cambiar medidas aquí y regenerar, no editar el SVG a mano |
| `turing_apu_logo_horizontal.png` | Logo horizontal **provisional** (1508×377, fondo blanco): solo sobre fondo claro |

## Reglas del ícono

- Fondo `#0F172A` plano; símbolo blanco `#FFFFFF` y un solo elemento naranja `#EA580C`.
- Hoja al 58 % del alto, centrada; trazo único de 44 px en lienzo de 1024 (extremos redondeados).
- Dos rubros blancos (medio y corto) y el total en naranja, la línea más larga.
- Sin flechas, texto, degradados ni sombras.

## Familia

Los demás productos usan el mismo marco, trazo y colores; cambia solo el símbolo y su
único elemento naranja (Factura: comprobante; Dental: muela; Bodega: cajas con flecha).

## Pendiente

- Favicon de 16 px simplificado (una línea blanca y el total, trazo más grueso): a 16 px las
  tres líneas se funden.
- Rehacer el logo horizontal en vector. El PNG actual lo generó una IA: redibujó el isotipo de
  Turingtech (no es el original), el texto es más pesado que el wordmark «TURINGTECH», el
  descriptor repite «APU» (mejor «Análisis de precios unitarios») y no hay versión para fondo
  oscuro. Usarlo solo mientras no exista el vector.
- El ícono aún no está conectado a `apps/web` (favicon, login).
