#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
ENV_FILE="${ENV_FILE:-.env}"
BACKUP_ROOT="${BACKUP_ROOT:-backups}"
umask 077

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing environment file: $ENV_FILE" >&2
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$BACKUP_ROOT/$STAMP"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

"${COMPOSE[@]}" exec -T postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "$BACKUP_DIR/database.dump"

"${COMPOSE[@]}" exec -T backend sh -c \
  'tar -czf - -C /app/uploads .' \
  > "$BACKUP_DIR/uploads.tar.gz"

(cd "$BACKUP_DIR" && sha256sum database.dump uploads.tar.gz) > "$BACKUP_DIR/SHA256SUMS"
printf 'created_at=%s\n' "$STAMP" > "$BACKUP_DIR/manifest.txt"
printf 'Backup created at %s\n' "$BACKUP_DIR"
