#!/usr/bin/env bash
# Run ONCE on the EC2 instance after the repo has been cloned to /opt/recta2.
# - Issues a Let's Encrypt certificate via HTTP-01 challenge
# - Swaps nginx into its production (HTTPS) config
# - Starts the full stack and runs migrations
#
# Prerequisites:
#   - DNS A-record for $DOMAIN points at this EC2's Elastic IP (already done via Terraform)
#   - /opt/recta2/.env.prod exists (created manually or uploaded separately)
#
# Usage:
#   sudo RECTA2_DOMAIN=recta.isayama-dev.com RECTA2_EMAIL=you@example.com bash scripts/deploy/first-setup.sh

set -euo pipefail

: "${RECTA2_DOMAIN:?RECTA2_DOMAIN is required (e.g. recta.isayama-dev.com)}"
: "${RECTA2_EMAIL:?RECTA2_EMAIL is required for Let's Encrypt registration}"

APP_DIR="${RECTA2_APP_DIR:-/opt/recta2}"
cd "$APP_DIR"

if [ ! -f .env.prod ]; then
  echo "ERROR: $APP_DIR/.env.prod is missing. Create it before running this script." >&2
  exit 1
fi

echo "=== Step 1/5: Bring up nginx with bootstrap config to serve ACME challenge ==="
# Temporarily swap default.conf → bootstrap.conf so nginx can start without certs.
cp docker/nginx-prod/default.conf docker/nginx-prod/default.conf.real
cp docker/nginx-prod/bootstrap.conf docker/nginx-prod/default.conf

docker compose -f docker-compose.prod.yml up -d --build nginx

echo "=== Step 2/5: Issue Let's Encrypt certificate ==="
# Write challenge files to the named volume via a throwaway container mount,
# then let certbot on the host drop them in through /var/www/certbot.
# The nginx container mounts /var/www/certbot as a named volume — for certbot to
# write into it, run certbot inside a sibling container that shares the same volume.
docker run --rm \
  -v "$(docker volume inspect -f '{{ .Mountpoint }}' recta2_certbot-webroot)":/var/www/certbot \
  -v /etc/letsencrypt:/etc/letsencrypt \
  certbot/certbot:latest certonly \
    --webroot -w /var/www/certbot \
    -d "$RECTA2_DOMAIN" \
    --email "$RECTA2_EMAIL" \
    --agree-tos --no-eff-email --non-interactive

echo "=== Step 3/5: Swap nginx to production config ==="
mv docker/nginx-prod/default.conf.real docker/nginx-prod/default.conf
docker compose -f docker-compose.prod.yml up -d --build nginx

echo "=== Step 4/5: Start the rest of the stack ==="
docker compose -f docker-compose.prod.yml up -d --build

echo "=== Step 5/5: Run Laravel migrations and optimize ==="
docker compose -f docker-compose.prod.yml exec -T laravel php artisan migrate --force
docker compose -f docker-compose.prod.yml exec -T laravel php artisan config:cache
docker compose -f docker-compose.prod.yml exec -T laravel php artisan route:cache
docker compose -f docker-compose.prod.yml exec -T laravel php artisan view:cache

echo
echo "Done. Visit https://$RECTA2_DOMAIN"
echo "Set up cert auto-renewal with: sudo crontab -e"
echo "  0 4 * * * cd $APP_DIR && docker run --rm -v \$(docker volume inspect -f '{{ .Mountpoint }}' recta2_certbot-webroot):/var/www/certbot -v /etc/letsencrypt:/etc/letsencrypt certbot/certbot:latest renew --quiet && docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload"
