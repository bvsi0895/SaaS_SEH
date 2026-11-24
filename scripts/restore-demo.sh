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

COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

(cd "$BACKUP_DIR" && sha256sum -c SHA256SUMS)

# Stop application writers but keep PostgreSQL available for the restore.
# Caddy is intentionally not stopped: an existing seh-caddy owns TLS state.
"${COMPOSE[@]}" stop backend web
"${COMPOSE[@]}" up -d --wait postgres

"${COMPOSE[@]}" exec -T postgres sh -c \
  'pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --single-transaction -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < "$BACKUP_DIR/database.dump"

"${COMPOSE[@]}" run --rm --no-deps \
  -T \
  --entrypoint sh backend \
  -c 'find /app/uploads -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +; tar -xzf - -C /app/uploads' \
  < "$BACKUP_DIR/uploads.tar.gz"

# Apply pending migrations only after restoring _prisma_migrations from the dump.
# This preserves historical state (for example, an 11-migration backup) and
# then applies newer migrations in order.
"${COMPOSE[@]}" run --rm --no-deps backend ./node_modules/.bin/prisma migrate deploy
"${COMPOSE[@]}" up -d --wait backend web
printf 'Restore completed from %s\n' "$BACKUP_DIR"
