#!/bin/bash
# ─── 1Biz Database Backup Script ─────────────────────────────────────────────
# Usage: ./scripts/backup.sh
# Cron:  0 3 * * * /root/allinone/scripts/backup.sh >> /var/log/mybiz-backup.log 2>&1
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/mybiz}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/mybiz_${TIMESTAMP}.sql.gz"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# Dump via docker compose (production) or direct pg_dump (dev)
if command -v docker &> /dev/null && docker compose ps postgres --status running &> /dev/null 2>&1; then
  docker compose exec -T postgres pg_dump \
    -U "${POSTGRES_USER:-mybiz}" \
    -d "${POSTGRES_DB:-mybiz}" \
    --no-owner \
    --no-privileges \
    --format=plain \
    | gzip > "$BACKUP_FILE"
elif command -v pg_dump &> /dev/null; then
  pg_dump \
    "${DATABASE_URL}" \
    --no-owner \
    --no-privileges \
    --format=plain \
    | gzip > "$BACKUP_FILE"
else
  echo "[$(date)] ERROR: Neither docker nor pg_dump found"
  exit 1
fi

# Verify backup is not empty
FILESIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
if [ "$FILESIZE" -lt 1000 ]; then
  echo "[$(date)] ERROR: Backup file too small (${FILESIZE} bytes) — likely failed"
  rm -f "$BACKUP_FILE"
  exit 1
fi

echo "[$(date)] Backup created: $BACKUP_FILE ($(numfmt --to=iec "$FILESIZE" 2>/dev/null || echo "${FILESIZE} bytes"))"

# Clean up old backups
DELETED=$(find "$BACKUP_DIR" -name "mybiz_*.sql.gz" -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date)] Cleaned up $DELETED backup(s) older than $RETENTION_DAYS days"
fi

echo "[$(date)] Backup complete"
