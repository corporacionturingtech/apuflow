# Instalación de APUflow

Requisitos: Ubuntu LTS con Docker y el plugin `docker compose`, y este repo (o el paquete de la versión) en el servidor.

## Instalar

```bash
cd deploy
./instalar.sh
```

Pide el dominio o la IP, genera los secretos en `deploy/.env` (no lo comparta ni lo suba al repo),
levanta el stack (API + web, PostgreSQL, Caddy y respaldos) y crea el administrador `admin`; la clave
generada se muestra una sola vez. Con un dominio público Caddy obtiene el certificado solo; con una IP
usa un certificado interno (el navegador avisará una vez). Repetir `./instalar.sh` no pisa el `.env`.

Variables opcionales al instalar: `ADMIN_USUARIO`, `ADMIN_CLAVE`, `VERSION`, `LICENCIA_OBLIGATORIA=1`
(sin licencia cargada, solo lectura), `HTTP_PUERTO`, `HTTPS_PUERTO`.

## Respaldos

Cada 24 h el servicio `respaldo` guarda `deploy/respaldos/apuflow-AAAAMMDD-HHMMSS.dump` y conserva
los últimos 14 (`RESPALDOS_A_GUARDAR` en `.env`). Copie esa carpeta fuera del servidor.
Respaldo manual:

```bash
docker compose exec respaldo bash /respaldo.sh una-vez
```

## Restaurar

```bash
./restaurar.sh respaldos/apuflow-AAAAMMDD-HHMMSS.dump
```

Pide confirmación, detiene la API, reemplaza la base y la vuelve a levantar. Los archivos de respaldo
pertenecen a root (los crea el contenedor); para borrarlos use `sudo`.

## Actualizar

Traiga la versión nueva del repo, ponga `VERSION=x.y.z` en `.env` y ejecute `docker compose up -d --build`.
Las migraciones se aplican solas al arrancar. Haga un respaldo antes.

## Licencia

Cargue `licencia.json` en Configuración › Licencia (ver `docs/arquitectura.md`).
