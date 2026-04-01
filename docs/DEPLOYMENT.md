# Provisum Deployment & Operations Guide

This document covers deploying Provisum to production, configuring environments, monitoring, troubleshooting, and operational procedures.

---

## Deployment Target: Vercel + Supabase Postgres

Provisum runs on **Vercel** (hosting) with **Supabase Postgres** (database). This replaces the previous Render + SQLite setup.

### Why This Stack?
- **Vercel**: Zero-config Next.js hosting, preview deploys, global CDN, serverless functions up to 300s
- **Supabase Postgres**: Managed PostgreSQL, persistent data across deploys, connection pooling, dashboard UI
- **No native modules**: Removed `better-sqlite3` — no more compilation issues on deploy

---

## Initial Deployment Setup

### Prerequisites
- GitHub account with Provisum repo
- Vercel account (free or paid plan)
- Supabase account with a project created
- Anthropic Claude API key

### Step 1: Supabase Project

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **Settings → Database → Connection string → URI**
3. Copy the **pooled** connection string (port `6543`) — this is your `DATABASE_URL`
4. Replace `[YOUR-PASSWORD]` with your database password

### Step 2: Create Tables & Seed Data

```bash
# In the airm/ directory
echo 'DATABASE_URL=postgresql://postgres.xxxxx:password@aws-1-us-east-1.pooler.supabase.com:6543/postgres' >> .env.local

pnpm db:push    # Creates all 51 tables in Supabase
pnpm db:seed    # Loads demo data (1K users, app users, SOD rules, etc.)
```

### Step 3: Deploy to Vercel

```bash
vercel link                    # Connect repo to Vercel project
vercel env add DATABASE_URL    # Add Supabase connection string
vercel env add ANTHROPIC_API_KEY
vercel env add ENCRYPTION_KEY  # Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel deploy --prod           # Deploy to production
```

Or connect via Vercel dashboard:
1. Import repo at [vercel.com/new](https://vercel.com/new)
2. Set environment variables in project settings
3. Deploy

### Step 4: Verify

1. Visit the deployed URL
2. Log in with `demo.admin` / `DemoGuide2026!`
3. Verify dashboard loads with data
4. Test: Generate Personas → Auto-Map → SOD Analysis
5. Test exports (Excel, PDF)

---

## Environment Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Supabase Postgres pooled connection string (port 6543) |
| `ANTHROPIC_API_KEY` | Yes | Claude API key from console.anthropic.com |
| `ENCRYPTION_KEY` | Prod | AES-256-GCM key for encrypting sensitive settings at rest |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (e.g., `https://anjxhleuutdcwipassij.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key for client-side auth |
| `CRON_SECRET` | Prod | Authenticates Vercel cron job requests to `/api/cron/exports` |
| `RESEND_API_KEY` | Prod | Resend email transport for invite emails and notifications |
| `NEXT_PUBLIC_APP_URL` | Prod | Application URL for email links (e.g., `https://demo.provisum.io`) |
| `NEXT_PUBLIC_SENTRY_DSN` | Prod | Sentry error tracking DSN |
| `SENTRY_AUTH_TOKEN` | Prod | Sentry source map upload token |
| `SENTRY_ORG` | Prod | Sentry organization slug (for source map uploads) |
| `SENTRY_PROJECT` | Prod | Sentry project slug (for source map uploads) |
| `NODE_ENV` | Auto | Set automatically by Vercel (`production` on deploy) |

**Generating encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Development

```bash
# .env.local (git-ignored)
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-1-us-east-1.pooler.supabase.com:6543/postgres
ANTHROPIC_API_KEY=sk-ant-v4-...
# ENCRYPTION_KEY is optional in dev — settings stored in plaintext without it
```

```bash
pnpm dev        # Opens http://localhost:3000
```

---

## Database Management

### Connection

The app uses `postgres-js` (not Supabase client SDK) through Drizzle ORM. Connection is pooled via Supabase's built-in PgBouncer (port 6543). Max 5 connections per instance.

### Schema Changes

1. Edit `db/schema.ts`
2. Run `pnpm db:push` (locally or via Vercel build command)
3. Drizzle handles drift detection — no migration files needed for dev

### Seeding

```bash
pnpm db:seed                    # Default demo pack (1K users)
pnpm db:seed --demo=<packname>  # Specific demo pack
```

Demo packs live in `data/demos/<packname>/` as CSV files.

API-based reset (for demo environments):
- `POST /api/demo/reset` — reseeds with default pack
- `POST /api/demo/switch` — switches to a different demo pack

### Backups

Supabase provides:
- **Daily automated backups** (Pro plan and above)
- **Point-in-time recovery** (Pro plan)
- Manual export via Supabase dashboard → SQL Editor → `pg_dump`

---

## Vercel Configuration

### Function Durations

AI pipeline routes have `maxDuration = 300` (5 minutes) for long-running operations:
- `/api/ai/generate-personas`
- `/api/ai/assign-personas`
- `/api/ai/auto-map`
- `/api/sod/analyze`
- `/api/demo/reset`, `/api/demo/switch`

These use `waitUntil()` from `@vercel/functions` for background processing.

### Cron Jobs

Configured in `vercel.json`:
- `/api/cron/exports` — Runs hourly, processes scheduled export jobs
- Secured by `CRON_SECRET` env var (Vercel sends it in the `Authorization` header)

### Build

Build command: `pnpm build` (default). No `db:push` or `db:seed` in build — data persists in Supabase.

---

## Custom Domains

| Domain | Purpose |
|--------|---------|
| demo.provisum.io | Demo instance (current deployment) |
| app.provisum.io | Production app (future) |
| provisum.io | Sales/marketing site (separate Vercel project) |

---

## Monitoring & Logs

### Vercel Logs
- **Function logs**: Vercel dashboard → project → Logs tab
- **Build logs**: Vercel dashboard → Deployments → click deployment
- **Runtime errors**: Check function invocation logs for 500s

### Supabase Logs
- **Database logs**: Supabase dashboard → Logs → Postgres
- **Connection pool**: Monitor active connections in Supabase dashboard

### Sentry Error Tracking
- `@sentry/nextjs` installed with client/server/edge configs
- `global-error.tsx` catches unhandled errors
- `lib/monitoring.ts` provides `reportError()` and `reportMessage()`
- **Requires** `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` env vars

### Health Check

`GET /api/health` — returns 200 if the app and database are reachable.

---

## Troubleshooting

### Build Fails

**Missing `DATABASE_URL`**: The DB connection is lazily initialized — builds should succeed even without `DATABASE_URL`. If build fails with DB errors, check that `db/index.ts` uses the lazy proxy pattern.

**TypeScript errors**: Run `pnpm build` locally first. All DB queries are async — check for missing `await`.

### Database Connection Errors

**`ECONNREFUSED`**: Check `DATABASE_URL` uses port `6543` (pooled), not `5432` (direct).

**`too many connections`**: The app limits to 5 connections. If hitting limits, check for connection leaks or reduce `max` in `db/index.ts`.

**`prepared statement already exists`**: This can happen with PgBouncer in transaction mode. The `postgres-js` driver handles this, but if it occurs, ensure you're using the pooled connection string.

### Slow Queries

1. Check Supabase dashboard → SQL Editor for slow query logs
2. Review `lib/queries.ts` for N+1 patterns
3. Add indexes in `db/schema.ts` if needed
4. Use `.limit()` and pagination for large result sets

---

## Rollback Procedure

### Code Rollback
1. Vercel dashboard → Deployments
2. Find the last working deployment
3. Click **Promote to Production**
4. Or: `vercel rollback` from CLI

### Database Rollback
1. Supabase dashboard → Backups (Pro plan)
2. Restore to a point-in-time before the issue
3. Or: Run `pnpm db:seed` to reset to clean demo state

---

## Deployment Checklist

- [ ] `pnpm build` passes locally with zero errors
- [ ] Code reviewed and approved
- [ ] Environment variables set in Vercel (DATABASE_URL, ANTHROPIC_API_KEY, ENCRYPTION_KEY)
- [ ] Database schema up to date (`pnpm db:push` if schema changed)
- [ ] Staging deployment verified (use Vercel preview deploy)
- [ ] Demo accounts work (login with `demo.admin` / `DemoGuide2026!`)
- [ ] AI pipeline runs: Generate Personas → Auto-Map → SOD Analysis
- [ ] Exports work (Excel, PDF)
- [ ] Team notified of deployment

---

## Migration History

**2026-03-26: SQLite → Supabase Postgres**
- Removed `better-sqlite3` and `@types/better-sqlite3`
- Added `postgres` (postgres-js) and `@vercel/functions`
- Converted all 47 tables from `sqliteTable` to `pgTable`
- Made all DB queries async (~100 files, ~800+ `await` additions)
- Deleted `db/audit-db.ts` (audit now uses main Drizzle DB)
- Demo reset uses in-process `seedDatabase()` instead of `execSync`
- Pre-migration archive: `archive/provisum-v0.6.0-20260325_174316.zip`

**2026-03-28: Supabase Auth Migration**
- Replaced custom bcrypt cookie sessions with Supabase Auth JWT sessions
- Added `@supabase/ssr` for server-side cookie management
- Created 17 auth users in Supabase matching seed data
- Enabled RLS on all 39+ tables (app bypasses via postgres role)
- Session cookie now managed by Supabase (httpOnly JWT)
