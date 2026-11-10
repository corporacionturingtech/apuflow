# Despliegue ligero (VPS compartido con nginx y Postgres del host)

Usado en 143.198.178.161 (apu.turingtech.com.ec). Sin Caddy ni Postgres en contenedor:
1. Compilar local: `docker build -f deploy/Dockerfile -t apuflow:demo .` y `docker save apuflow:demo | gzip`.
2. Subir a `/opt/apuflow`, `docker load`, crear `.env` (`BD_CLAVE`, `VERSION`) y rol/BD `apuflow` en el Postgres del host.
3. `docker compose up -d` (escucha en 127.0.0.1:3200 por `network_mode: host`), vhost `nginx-apu.conf`, `certbot --nginx -d <dominio>`.
4. Migraciones (el contenedor no las corre solo): `docker compose exec -T apuflow pnpm --filter api db:migrate`.
5. Admin: `docker compose exec -T -e ADMIN_USUARIO=admin -e ADMIN_CLAVE=… apuflow pnpm --filter api db:seed`.
6. Respaldo: `respaldo-diario.sh` por cron (`/etc/cron.d/apuflow-respaldo`).

## Otro cliente en el mismo VPS (un stack y una base por cliente)

Ejemplo ARPECE (arpece.turingtech.com.ec, puerto 3201, base `apuflow_arpece`):
1. DNS: registro A `arpece` → IP del VPS (Cloudflare, igual que `apu`).
2. Postgres del host: rol y base propios (`apuflow_arpece`), clave generada.
3. `/opt/apuflow-arpece/` con este `docker-compose.yml` y `.env`: `VERSION`, `PUERTO=3201`,
   `BD_NOMBRE=apuflow_arpece`, `BD_USUARIO=apuflow_arpece`, `BD_CLAVE`, `LIMITE_MEMORIA=220m`.
4. `docker compose up -d`, migraciones y admin como arriba (pasos 4 y 5).
5. vhost: copia de `nginx-apu.conf` con otro `server_name` y `proxy_pass` al 3201; `certbot --nginx -d <dominio>`.
6. Cron: `respaldo-diario.sh apuflow_arpece /opt/apuflow-arpece/respaldos`.
7. En la app (admin): Inicio › «Vivienda y obra civil» (o el sector del cliente), Configuración › Empresa (nombre, logo, vista) y, en el panel Indirectos de la oferta de ejemplo, «Usar estos porcentajes en las ofertas nuevas».
En reposo una instancia usa ~125 MB (`docker stats`); `LIMITE_MEMORIA` es su tope (300m por
defecto, 220m en ARPECE). Antes de sumar otra, revisar la memoria disponible con `free -m`.
