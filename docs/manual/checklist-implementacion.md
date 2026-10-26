# Checklist de implementación

Cliente: ____________  Responsable: ____________  Fecha: ____________

## 1. Servidor
- [ ] Ubuntu LTS con Docker y `docker compose`.
- [ ] `./instalar.sh` ejecutado (dominio o IP); clave del administrador guardada en lugar seguro.
- [ ] Se abre `https://<dominio>` e ingresa con `admin`.
- [ ] Respaldo manual hecho y **restauración probada** ([deploy/LEEME.md](../../deploy/LEEME.md)).
- [ ] Carpeta de respaldos copiada fuera del servidor.

## 2. Empresa
- [ ] Licencia cargada (Configuración › Licencia).
- [ ] Empresa configurada: IVA, moneda, formato, logo, acento, tipo de oferta.

## 3. Usuarios
- [ ] Un usuario por persona con su rol y disciplinas; el administrador cambió su clave inicial.

## 4. Datos
- [ ] Libros de Excel del cliente importados (formato en [excel.md](../producto/excel.md)); los totales **cuadran** con el libro original.
- [ ] Listas de precios revisadas (materiales, equipos, mano de obra, transporte).
- [ ] Bloques frecuentes creados.
- [ ] Una oferta de prueba exportada a Excel y comparada con la del cliente.

## 5. Capacitación
- [ ] Administrador: [guía](administrador.md)
- [ ] Precios: [guía](precios.md)
- [ ] Cotizadores: [guía](cotizador.md), con las misiones guiadas
- [ ] Lectores: [guía](lector.md)

## 6. Entrega
- [ ] Contacto de soporte entregado y fecha del primer respaldo verificado.
