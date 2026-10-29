#!/usr/bin/env bash
set -e
cd /opt/apuflow/respaldos
sudo -u postgres pg_dump apuflow | gzip > apuflow-$(date +%F).sql.gz
ls -1t apuflow-*.sql.gz | tail -n +15 | xargs -r rm
