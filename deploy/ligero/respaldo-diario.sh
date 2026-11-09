#!/usr/bin/env bash
set -e
# Uso: respaldo-diario.sh [base] [directorio]  (por defecto la instancia original)
BD=${1:-apuflow}
cd "${2:-/opt/apuflow/respaldos}"
sudo -u postgres pg_dump "$BD" | gzip > "$BD-$(date +%F).sql.gz"
ls -1t "$BD"-*.sql.gz | tail -n +15 | xargs -r rm
