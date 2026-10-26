#!/usr/bin/env bash
# Instala APUflow: pide dominio/IP, genera secretos, levanta el stack y crea el administrador.
# Se puede repetir: no pisa un .env existente.
set -euo pipefail
cd "$(dirname "$0")"

command -v docker >/dev/null || { echo "Falta Docker. Instálelo: https://docs.docker.com/engine/install/ubuntu/"; exit 1; }
docker compose version >/dev/null || { echo "Falta el plugin docker compose."; exit 1; }

if [ ! -f .env ]; then
  DOMINIO="${DOMINIO:-}"
  [ -n "$DOMINIO" ] || read -rp "Dominio o IP del servidor (ej. apu.empresa.com o 192.168.1.20): " DOMINIO
  if [[ "$DOMINIO" =~ ^[0-9.]+$ || "$DOMINIO" == localhost ]]; then
    TLS="tls internal"   # IP o red interna: certificado propio de Caddy
  else
    TLS=""               # dominio público: Let's Encrypt automático
  fi
  umask 077
  cat > .env <<EOF
DOMINIO=$DOMINIO
CADDY_TLS="$TLS"
BD_CLAVE=$(openssl rand -hex 24)
VERSION=${VERSION:-local}
LICENCIA_OBLIGATORIA=${LICENCIA_OBLIGATORIA:-0}
HTTP_PUERTO=${HTTP_PUERTO:-80}
HTTPS_PUERTO=${HTTPS_PUERTO:-443}
EOF
  echo ".env creado (secretos generados)."
fi

docker compose up -d --build

echo "Esperando a la API…"
for _ in $(seq 1 60); do
  docker compose exec -T apuflow node -e "fetch('http://localhost:3000/api/salud').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null && break
  sleep 2
done

ADMIN_USUARIO="${ADMIN_USUARIO:-admin}"
if [ -z "${ADMIN_CLAVE:-}" ]; then ADMIN_CLAVE="$(openssl rand -base64 12 | tr -d '/+=')"; GENERADA=1; fi
docker compose exec -T -e ADMIN_USUARIO="$ADMIN_USUARIO" -e ADMIN_CLAVE="$ADMIN_CLAVE" apuflow pnpm --filter api db:seed

# shellcheck disable=SC1091
. ./.env
echo
echo "Listo. Ingrese a https://$DOMINIO"
if [ "${GENERADA:-0}" = 1 ]; then echo "Usuario: $ADMIN_USUARIO   Clave: $ADMIN_CLAVE   (guárdela; no se vuelve a mostrar)"; fi
