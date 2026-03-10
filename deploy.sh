#!/bin/sh

set -e

echo "=== Recta2 Deploy ==="

# Stop all containers
docker compose down

# Install dependencies
echo "=== Installing dependencies ==="
docker compose run --rm composer install --no-dev --optimize-autoloader
docker compose run --rm node npm install --include=dev

# Run migrations
echo "=== Running migrations ==="
docker compose run --rm artisan migrate --force

# Clear caches
echo "=== Clearing caches ==="
docker compose run --rm artisan optimize:clear

# Build frontend
echo "=== Building frontend ==="
docker compose run --rm node npm run build

# Start services
echo "=== Starting services ==="
docker compose up -d

echo "=== Deploy complete ==="
