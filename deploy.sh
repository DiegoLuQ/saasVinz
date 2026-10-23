#!/usr/bin/env bash
# Actualiza Vinzer en el VPS: trae el código, reconstruye, levanta y limpia.
#
#   ./deploy.sh
#
# Las migraciones se aplican solas al arrancar el backend (entrypoint.sh).
# La limpieza solo borra imágenes sin etiqueta (<none>, las versiones viejas que
# deja cada build) y la caché de build de más de 3 días. NUNCA toca volúmenes:
# la base de datos vive en el volumen postgres_data.
set -euo pipefail
cd "$(dirname "$0")"

echo "==> git pull"
git pull --ff-only

echo "==> docker compose build"
docker compose build

echo "==> docker compose up -d"
docker compose up -d

echo "==> Limpieza de imágenes viejas"
docker image prune -f
docker builder prune -f --filter "until=72h"

echo "==> Estado"
docker compose ps
df -h / | tail -1
echo "Listo. Revisa las migraciones con: docker logs vinzer_backend 2>&1 | grep -i 'upgrade\|error' | tail"
