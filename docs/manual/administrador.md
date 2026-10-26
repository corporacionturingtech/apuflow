# Guía del administrador

## Usuarios
Menú **Configuración › Usuarios**. Cree cada persona con su nombre de usuario, clave y rol:

- **Administrador**: todo, incluida la configuración.
- **Precios**: edita las listas de precios y los APUs.
- **Cotizador**: crea y edita ofertas y bloques, e importa libros de Excel.
- **Lector** (Consulta): solo mira y exporta.

A cada usuario puede asignarle disciplinas. Un usuario se desactiva en lugar de borrarse; no puede
quitarse el rol de administrador a sí mismo.

## Empresa
**Configuración › Empresa**: IVA, moneda y formato de números, logo, color de acento y tipo de oferta.
Estos valores se aplican a toda la empresa; no hay que tocar nada más por cliente.

## Licencia
**Configuración › Licencia**: cargue el archivo `licencia.json` que le entregó Corporación Turingtech.
Con la licencia vencida el sistema pasa a solo lectura, pero **exportar a Excel siempre funciona**.
Un aviso en la parte superior le indica los días que faltan.

## Respaldos
Se hacen solos cada 24 horas y se conservan los últimos 14. Copie la carpeta de respaldos fuera del
servidor. Para respaldar o restaurar a mano, siga [`deploy/LEEME.md`](../../deploy/LEEME.md).

## Historial
**Control › Historial** muestra quién cambió qué, con el valor anterior y el nuevo.
