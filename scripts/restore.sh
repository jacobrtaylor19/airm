#!/bin/bash
set -euo pipefail

BACKUP_FILE="$1"
DB_PATH="${DATABASE_PATH:-./data/airm.db}"
RESTORE_FILE="${BACKUP_FILE%.enc}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./scripts/restore.sh <backup-file.enc>"
  exit 1
fi

# Decrypt
openssl enc -aes-256-cbc -d -salt -pbkdf2 \
  -in "$BACKUP_FILE" \
  -out "$RESTORE_FILE" \
  -pass env:BACKUP_ENCRYPTION_KEY

# Verify integrity
sqlite3 "$RESTORE_FILE" "PRAGMA integrity_check;" | grep -q "ok" || {
  echo "ERROR: Backup integrity check failed"
  rm -f "$RESTORE_FILE"
  exit 1
}

# Replace (stop app first in production)
cp "$RESTORE_FILE" "$DB_PATH"
rm "$RESTORE_FILE"

echo "Restore completed from: $BACKUP_FILE"
