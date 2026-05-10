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

# Optional one-shot seed mechanism. Drop a marker file at the repo root
# (`scripts/deploy/.run-seed-once` or `.run-fresh-seed-once`) and commit it.
# The next deploy will run the corresponding seed action and then this script
# leaves the file in place — remove it in a follow-up commit.
#
# Why marker files in git instead of a separate workflow: pushing
# `.github/workflows/*.yml` requires the `workflow` PAT scope, which not all
# clones have. Marker files are plain text and pushable with any token.
if [ -f scripts/deploy/.run-fresh-seed-once ]; then
  echo "=== One-shot fresh-seed (DESTRUCTIVE — marker file present) ==="
  docker compose -f docker-compose.prod.yml exec -T laravel php artisan migrate:fresh --seed --force
elif [ -f scripts/deploy/.run-seed-once ]; then
  echo "=== One-shot seed (additive, marker file present) ==="
  docker compose -f docker-compose.prod.yml exec -T laravel php artisan db:seed --force
fi

echo "=== Refreshing caches ==="
docker compose -f docker-compose.prod.yml exec -T laravel php artisan config:cache
docker compose -f docker-compose.prod.yml exec -T laravel php artisan route:cache
docker compose -f docker-compose.prod.yml exec -T laravel php artisan view:cache

echo "=== Pruning old images ==="
docker image prune -f

echo "=== Deploy complete ==="
