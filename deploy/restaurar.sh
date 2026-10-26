#!/usr/bin/env bash
# Restaura la base desde un respaldo: ./restaurar.sh respaldos/apuflow-AAAAMMDD-HHMMSS.dump
# Reemplaza los datos actuales.
set -euo pipefail
cd "$(dirname "$0")"
archivo="${1:-}"
[ -f "$archivo" ] || { echo "Uso: $0 <archivo.dump> (los respaldos están en deploy/respaldos/)"; exit 1; }
if [ "${CONFIRMAR:-}" != si ]; then
  read -rp "Esto reemplaza todos los datos actuales con $archivo. ¿Continuar? (escriba si): " r
  [ "$r" = si ] || { echo "Cancelado."; exit 1; }
fi

docker compose stop apuflow
docker compose exec -T postgres pg_restore -U apuflow -d apuflow --clean --if-exists --no-owner < "$archivo"
docker compose start apuflow
echo "Restauración completa. La API vuelve a arrancar (aplica migraciones pendientes si las hay)."
