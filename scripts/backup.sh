#!/bin/bash
set -euo pipefail

DB_PATH="${DATABASE_PATH:-./data/airm.db}"
BACKUP_DIR="${BACKUP_DIR:-/data/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/airm_${TIMESTAMP}.db"

mkdir -p "$BACKUP_DIR"

# Use SQLite backup API (safe for WAL mode)
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Encrypt backup
openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in "$BACKUP_FILE" \
  -out "${BACKUP_FILE}.enc" \
  -pass env:BACKUP_ENCRYPTION_KEY

rm "$BACKUP_FILE"

# Prune backups older than 30 days
find "$BACKUP_DIR" -name "*.enc" -mtime +30 -delete

echo "Backup completed: ${BACKUP_FILE}.enc"
