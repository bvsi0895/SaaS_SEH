#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
ENV_FILE="${ENV_FILE:-.env}"
BACKUP_ROOT="${BACKUP_ROOT:-backups}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing environment file: $ENV_FILE" >&2
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$BACKUP_ROOT/$STAMP"
mkdir -p "$BACKUP_DIR"
BACKUP_DIR_ABS="$(cd "$BACKUP_DIR" && pwd)"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

"${COMPOSE[@]}" exec -T postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "$BACKUP_DIR/database.dump"

"${COMPOSE[@]}" run --rm --no-deps \
  -v "$BACKUP_DIR_ABS:/backup" \
  --entrypoint sh backend \
  -c 'tar -czf /backup/uploads.tar.gz -C /app/uploads .'

sha256sum "$BACKUP_DIR/database.dump" "$BACKUP_DIR/uploads.tar.gz" > "$BACKUP_DIR/SHA256SUMS"
printf 'created_at=%s\n' "$STAMP" > "$BACKUP_DIR/manifest.txt"
printf 'Backup created at %s\n' "$BACKUP_DIR"
