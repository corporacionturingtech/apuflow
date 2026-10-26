#!/usr/bin/env bash
# Respaldo diario de la base (pg_dump formato custom) con rotación.
# Sin argumentos: bucle diario (servicio `respaldo`). Con `una-vez`: un respaldo y sale.
set -euo pipefail
GUARDAR="${RESPALDOS_A_GUARDAR:-14}"
DESTINO="${DESTINO:-/respaldos}"

respaldar() {
  local archivo="$DESTINO/apuflow-$(date +%Y%m%d-%H%M%S).dump"
  pg_dump -Fc -f "$archivo.parcial"
  mv "$archivo.parcial" "$archivo"
  echo "Respaldo creado: $archivo"
  ls -1t "$DESTINO"/apuflow-*.dump | tail -n +"$((GUARDAR + 1))" | xargs -r rm -v
}

mkdir -p "$DESTINO"
if [ "${1:-}" = "una-vez" ]; then respaldar; exit 0; fi
until pg_isready -q; do sleep 2; done
while true; do
  respaldar || echo "Falló el respaldo" >&2
  sleep 86400
done
