#!/bin/sh
set -e

echo "[AIRM] Pushing database schema..."
pnpm db:push

echo "[AIRM] Checking initialisation status..."
INITIALIZED=$(node -e "
try {
  const Database = require('better-sqlite3');
  const db = new Database(process.env.DATABASE_PATH || './data/airm.db');
  const r = db.prepare('SELECT COUNT(*) as c FROM app_users').get();
  process.stdout.write(r.c > 0 ? 'yes' : 'no');
} catch(e) {
  process.stdout.write('no');
}
")

if [ "$INITIALIZED" = "no" ]; then
  echo "[AIRM] First run — seeding database..."
  pnpm db:seed
else
  echo "[AIRM] Database already initialised, skipping seed."
fi

echo "[AIRM] Starting server..."
exec pnpm start
