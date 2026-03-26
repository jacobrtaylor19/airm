#!/bin/bash
set -euo pipefail

DB_PATH="${DATABASE_PATH:-./data/airm.db}"
BACKUP_DIR="${BACKUP_DIR:-/data/backups}"
TEMP_DIR=$(mktemp -d)

# Find latest backup
LATEST=$(find "$BACKUP_DIR" -name "*.enc" -type f | sort -r | head -1)

if [ -z "$LATEST" ]; then
  echo "ERROR: No backups found in $BACKUP_DIR"
  exit 1
fi

echo "Verifying backup: $LATEST"

# Decrypt to temp
openssl enc -aes-256-cbc -d -salt -pbkdf2 \
  -in "$LATEST" \
  -out "$TEMP_DIR/verify.db" \
  -pass env:BACKUP_ENCRYPTION_KEY

# Integrity check
INTEGRITY=$(sqlite3 "$TEMP_DIR/verify.db" "PRAGMA integrity_check;")
if [ "$INTEGRITY" != "ok" ]; then
  echo "ERROR: Integrity check failed: $INTEGRITY"
  rm -rf "$TEMP_DIR"
  exit 1
fi
echo "Integrity check: PASSED"

# Compare row counts
TABLES="app_users users personas source_roles target_roles sod_rules audit_log"
echo ""
echo "Row count comparison:"
printf "%-25s %10s %10s %s\n" "Table" "Live" "Backup" "Status"
printf "%-25s %10s %10s %s\n" "-----" "----" "------" "------"

ALL_OK=true
for table in $TABLES; do
  LIVE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "N/A")
  BACKUP_COUNT=$(sqlite3 "$TEMP_DIR/verify.db" "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "N/A")

  if [ "$LIVE_COUNT" = "$BACKUP_COUNT" ]; then
    STATUS="OK"
  else
    STATUS="MISMATCH"
    ALL_OK=false
  fi

  printf "%-25s %10s %10s %s\n" "$table" "$LIVE_COUNT" "$BACKUP_COUNT" "$STATUS"
done

rm -rf "$TEMP_DIR"

echo ""
if $ALL_OK; then
  echo "Verification: PASSED"
else
  echo "Verification: WARNING — row count mismatches detected (may be expected if backup is not from today)"
fi
