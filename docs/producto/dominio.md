# Dominio: glosario y modelo de datos

El lenguaje del producto es el del cliente. Estos términos se usan igual en la UI,
en el código (en español) y en la BD.

## Glosario

| Término | Qué es | Nombre en código |
|---|---|---|
| **Empresa** | La instalación de APUflow. Una instancia = una empresa cliente. | `empresa` (config) |
| **Insumo** | Cualquier cosa con precio en una lista: material, equipo, mano de obra o transporte. | `insumo` |
| **Lista de precios** | Las cuatro hojas de su Excel: Materiales, Equipos, Mano Obra, Transporte. | `tipo: 'MA' \| 'EQ' \| 'MO' \| 'TR'` |
| **Precio unitario (PU)** | Precio escrito a mano en la lista. En materiales se multiplica por el FACTOR. | `pu` |
| **Precio referencial** | El precio anterior, guardado al cambiarlo, para comparar. | `precioAnterior` |
| **FACTOR** | Multiplicador global de materiales (celda de su hoja Materiales). | `factor` |
| **APU** | Análisis de precio unitario: receta de un rubro con sus cuatro componentes. | `apu` |
| **Rendimiento (R)** | Horas por unidad del rubro. Multiplica equipos y mano de obra. | `rendimiento` |
| **Herramienta menor (HM)** | % de la mano de obra que se suma a equipos. Por defecto 5 %. | `pctHerramientaMenor` |
| **Rubro** | Una línea del presupuesto: un APU con una cantidad dentro de un capítulo. | `rubro` |
| **Capítulo** | Agrupación de rubros en la oferta (p. ej. "Bahía de 230 kV"). | `capitulo` |
| **Bloque** | Plantilla reutilizable de rubros con cantidades ("bahía de 69"). Al usarlo crea un capítulo. | `bloque` |
| **Oferta** | El presupuesto completo para un cliente. Equivale a un libro de Excel. | `oferta` |
| **Versión** | Foto guardada de una oferta para comparar (antes/después de ajustar). | `version` |
| **Disciplina** | Civil, Eléctrico, Mecánico (configurable por empresa). Cada APU y rubro tiene una. | `disciplina` |
| **Indirectos y utilidad** | Lista de % por oferta (gastos generales, de campo, imprevistos, garantías, utilidad). Se suman y se aplican al costo directo. | `indirectos[]` |
| **Costo directo (CU)** | EQ + MO + MA + TRA de un APU. | `cu` |
| **P.U. ofertado** | CU × (1 + % indirectos). | `puOfertado` |
| **Costo objetivo** | Costo referencial que da el cliente final; la oferta debe llegar a él. | `costoObjetivo` |
| **Brecha** | Subtotal ofertado − costo objetivo. | `brecha` |
| **Peso** | CU total del rubro / CU total de la oferta. | `peso` |
| **Tipo de oferta** | Público (SERCOP: muestra CPC, origen P/ND/I y VAE) o Privado. | `tipo` |
| **CPC / VAE** | Código de producto SERCOP y % de valor agregado ecuatoriano. Solo ofertas públicas. | `cpc`, `vae` |

## Relaciones

```
Insumo (MA|EQ|MO|TR) ──< LineaApu >── Apu ──< Rubro >── Capitulo >── Oferta
                                       │                                │
                                       └──< LineaBloque >── Bloque      ├── indirectos[]
                                                                        ├── costoObjetivo
                                                                        └──< Version (snapshot JSON)
HistorialPrecio >── Insumo         Bitacora (quién, qué, antes, después, cuándo)
Usuario ── rol (admin | precios | cotizador | lector) ── disciplinas[]
```

Decisiones de modelo:
- **Las listas de precios y los APUs son de la empresa**, no de la oferta: cambiar un precio
  actualiza todas las ofertas abiertas. Una oferta **emitida** guarda una versión congelada
  (snapshot) para que su total no cambie después.
- El APU se guarda una vez y los rubros lo referencian. Editar un APU desde una oferta
  pregunta: "¿cambiar el APU para todas las ofertas o solo en esta?" (la segunda crea una copia).
- Los ID visibles del rubro (`C01`, `E07`) son del cliente y editables; las PK son UUID.
- Toda edición pasa por la bitácora (usuario, entidad, campo, antes, después, fecha).
