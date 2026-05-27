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
# docker-compose.prod.yml の build args (${VITE_GOOGLE_MAPS_API_KEY:-} 等) は
# `docker compose` を起動した shell の環境変数を参照する。runtime 用の
# env_file (.env.prod) は build フェーズには渡らないので、ビルド時だけ
# .env.prod を一時的に export して compose が拾えるようにする。
# VITE_* はフロント bundle に焼き込まれるので、これを忘れると本番で
# Google Maps が読めない等の事故になる。
if [ -f .env.prod ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.prod
  set +a
fi
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
#
# 重要: 本番では `ProductionSeeder` (管理者/マスター/設定/AI 教材のみ、
# 冪等) を必ず使うこと。DatabaseSeeder (デフォルト) は Faker で作った
# dummy 店舗 80 件などを投入するので本番に流すと事故になる。
if [ -f scripts/deploy/.run-fresh-seed-once ]; then
  echo "=== One-shot fresh-seed (DESTRUCTIVE — marker file present) ==="
  echo "    -> migrate:fresh + ProductionSeeder (master/config only)"
  docker compose -f docker-compose.prod.yml exec -T laravel php artisan migrate:fresh --seeder=Database\\Seeders\\ProductionSeeder --force
elif [ -f scripts/deploy/.run-seed-once ]; then
  echo "=== One-shot seed (additive, marker file present) ==="
  echo "    -> db:seed --class=ProductionSeeder (idempotent)"
  docker compose -f docker-compose.prod.yml exec -T laravel php artisan db:seed --class=Database\\Seeders\\ProductionSeeder --force
fi

echo "=== Refreshing caches ==="
docker compose -f docker-compose.prod.yml exec -T laravel php artisan config:cache
docker compose -f docker-compose.prod.yml exec -T laravel php artisan route:cache
docker compose -f docker-compose.prod.yml exec -T laravel php artisan view:cache

echo "=== Pruning old images ==="
docker image prune -f

echo "=== Deploy complete ==="
