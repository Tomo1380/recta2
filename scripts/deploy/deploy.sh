#!/usr/bin/env bash
# Run on the EC2 instance to pull the latest code and roll out a new build.
# Invoked by GitHub Actions over SSH, or manually.
set -euo pipefail

APP_DIR="${RECTA2_APP_DIR:-/opt/recta2}"
cd "$APP_DIR"

echo "=== Pulling latest code ==="
git fetch --all --prune
git reset --hard origin/main

echo "=== Building and restarting containers ==="
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

echo "=== Running migrations ==="
docker compose -f docker-compose.prod.yml exec -T laravel php artisan migrate --force

echo "=== Refreshing caches ==="
docker compose -f docker-compose.prod.yml exec -T laravel php artisan config:cache
docker compose -f docker-compose.prod.yml exec -T laravel php artisan route:cache
docker compose -f docker-compose.prod.yml exec -T laravel php artisan view:cache

echo "=== Pruning old images ==="
docker image prune -f

echo "=== Deploy complete ==="
