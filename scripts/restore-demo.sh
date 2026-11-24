#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
ENV_FILE="${ENV_FILE:-.env}"
BACKUP_DIR="${1:?Usage: CONFIRM_RESTORE=YES bash scripts/restore-demo.sh backups/TIMESTAMP}"

if [[ "${CONFIRM_RESTORE:-}" != "YES" ]]; then
  echo "Restore is destructive. Set CONFIRM_RESTORE=YES to continue." >&2
  exit 2
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing environment file: $ENV_FILE" >&2
  exit 1
fi
if [[ ! -f "$BACKUP_DIR/database.dump" || ! -f "$BACKUP_DIR/uploads.tar.gz" || ! -f "$BACKUP_DIR/SHA256SUMS" ]]; then
  echo "Backup directory is incomplete: $BACKUP_DIR" >&2
  exit 1
fi

BACKUP_DIR_ABS="$(cd "$BACKUP_DIR" && pwd)"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

(cd "$BACKUP_DIR" && sha256sum -c SHA256SUMS)

# Stop application writers but keep PostgreSQL available for the restore.
"${COMPOSE[@]}" stop backend web caddy
"${COMPOSE[@]}" up -d --wait postgres
"${COMPOSE[@]}" run --rm --no-deps backend ./node_modules/.bin/prisma migrate deploy

"${COMPOSE[@]}" exec -T postgres sh -c \
  'pg_restore --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < "$BACKUP_DIR/database.dump"

"${COMPOSE[@]}" run --rm --no-deps \
  -v "$BACKUP_DIR_ABS:/backup" \
  --entrypoint sh backend \
  -c 'find /app/uploads -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +; tar -xzf /backup/uploads.tar.gz -C /app/uploads'

"${COMPOSE[@]}" up -d --wait backend web caddy
printf 'Restore completed from %s\n' "$BACKUP_DIR"
