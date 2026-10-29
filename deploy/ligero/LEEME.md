# Despliegue ligero (VPS compartido con nginx y Postgres del host)

Usado en 143.198.178.161 (apu.turingtech.com.ec). Sin Caddy ni Postgres en contenedor:
1. Compilar local: `docker build -f deploy/Dockerfile -t apuflow:demo .` y `docker save apuflow:demo | gzip`.
2. Subir a `/opt/apuflow`, `docker load`, crear `.env` (`BD_CLAVE`, `VERSION`) y rol/BD `apuflow` en el Postgres del host.
3. `docker compose up -d` (escucha en 127.0.0.1:3200 por `network_mode: host`), vhost `nginx-apu.conf`, `certbot --nginx -d <dominio>`.
4. Admin: `docker compose exec -T -e ADMIN_USUARIO=admin -e ADMIN_CLAVE=… apuflow pnpm --filter api db:seed`.
5. Respaldo: `respaldo-diario.sh` por cron (`/etc/cron.d/apuflow-respaldo`).
