#!/usr/bin/env bash
# Daily PostgreSQL backup to S3. Triggered by cron on the host (set up in user_data.sh).
set -euo pipefail

APP_DIR="${RECTA2_APP_DIR:-/opt/recta2}"
BUCKET="${RECTA2_BACKUP_BUCKET:?RECTA2_BACKUP_BUCKET must be set}"
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILENAME="recta2-${TIMESTAMP}.sql.gz"
TMP_FILE="/tmp/${FILENAME}"

cd "$APP_DIR"

# shellcheck disable=SC1091
set -a; source .env.prod; set +a

docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$DB_USERNAME" -d "$DB_DATABASE" --no-owner --no-privileges \
  | gzip > "$TMP_FILE"

aws s3 cp "$TMP_FILE" "s3://${BUCKET}/postgres/${FILENAME}" --no-progress

rm -f "$TMP_FILE"
echo "Backup uploaded: s3://${BUCKET}/postgres/${FILENAME}"
