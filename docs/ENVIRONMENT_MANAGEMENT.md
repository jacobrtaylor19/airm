# Provisum Environment Management

Last updated: 2026-04-06

---

## Architecture

```
provisum-app (one GitHub repo)
  ├── provisum-demo     (Vercel) → demo.provisum.io     → provisum-demo (Supabase)
  ├── provisum-sandbox  (Vercel) → sandbox.provisum.io  → provisum-sandbox (Supabase)
  └── provisum-prod     (Vercel) → app.provisum.io      → provisum-prod (Supabase)

provisum-site (separate repo)
  └── provisum-site     (Vercel) → provisum.io          → provisum-prod (leads only)
```

## Naming Convention

Everything follows **`provisum-{purpose}`**.

| Resource | Demo | Sandbox | Prod | Site |
|----------|------|---------|------|------|
| Vercel project | provisum-demo | provisum-sandbox | provisum-prod | provisum-site |
| Domain | demo.provisum.io | sandbox.provisum.io | app.provisum.io | provisum.io |
| Supabase project | provisum-demo | provisum-sandbox | provisum-prod | N/A |
| `PROVISUM_ENV` | `demo` | `sandbox` | `production` | N/A |
| Supabase ref | `rnglqowkvkpmtsoiinyo` | `oqhlkxfcuvmzdpfxxatu` | `sfwecmjbqhurglcdsmbb` | N/A |

## Environments

### provisum-demo (pre-loaded demo for prospects)

| Vercel Env | Domain | `PROVISUM_ENV` |
|------------|--------|----------------|
| Production | demo.provisum.io | `demo` |
| Preview | *.vercel.app | `demo` |

- 1K users, 24 personas, mappings, SOD conflicts — fully populated
- Lead gate active (captures name/email before access)
- Persona pills shown (8 quick-login accounts)
- Demo reset/switch enabled (11 industry packs)
- Uploads disabled (pre-loaded data protected)
- Blue banner: "Demo Environment"

### provisum-sandbox (blank env for evaluation)

| Vercel Env | Domain | `PROVISUM_ENV` |
|------------|--------|----------------|
| Production | sandbox.provisum.io | `sandbox` |
| Preview | *.vercel.app | `sandbox` |

- Blank — only org, release, and login accounts
- No lead gate (prospects already qualified)
- Persona pills shown
- Uploads ENABLED (prospect tries their own data)
- Demo reset resets to blank state
- Purple banner: "Sandbox Environment"

### provisum-prod (real customers)

| Vercel Env | Domain | `PROVISUM_ENV` |
|------------|--------|----------------|
| Production | app.provisum.io | `production` |
| Preview | *.vercel.app | `preview` (uses demo DB) |

- Real customer data only
- No demo features, no banner
- Demo reset/switch blocked (403)
- Cron jobs active, Sentry active
- Safety guard prevents demo/sandbox from connecting to this DB

## Day-to-Day Workflow

### The Rule: Never push directly to production

```
1. Write code locally (PROVISUM_ENV=development, demo DB)
       │
2. Push branch → PR against main
       │
       ├── All 3 Vercel projects auto-create Preview deployments
       │
3. Review & test on Preview URLs
       │
4. Merge PR → main
       │
       └── All 3 projects auto-deploy to Production
```

### Where to test

| What to check | Where | Why |
|---------------|-------|-----|
| Feature works | provisum-demo preview | Has full data |
| Demo gate / pills | provisum-demo preview | Demo-only features |
| Sandbox (blank state, uploads) | provisum-sandbox preview | Sandbox-only |
| Prod safety (no demo features) | provisum-prod preview | Safe — uses demo DB |
| Schema migration | Push to demo DB first, test, then prod | Never untested schema in prod |

### Schema changes

```bash
DATABASE_URL=<demo> pnpm db:push        # test first
DATABASE_URL=<sandbox> pnpm db:push     # then sandbox
DATABASE_URL=<prod> pnpm db:push        # then prod (before merge)
```

## Safety Guards

| Guard | File | Protection |
|-------|------|------------|
| DB connection | `db/index.ts` | Non-prod env + prod DB → fatal error |
| Demo reset | `app/api/demo/reset/route.ts` | PROVISUM_ENV=production → 403 |
| Demo switch | `app/api/demo/switch/route.ts` | PROVISUM_ENV=production → 403 |
| Env validation | `lib/validate-env.ts` | Missing PROVISUM_ENV → fatal in prod |
| Upload guard | `app/api/upload/[type]/route.ts` | PROVISUM_ENV=demo → 403 |

## Scripts

| Script | Purpose | Target DB |
|--------|---------|-----------|
| `pnpm db:seed` | Full demo data (1K users) | provisum-demo |
| `pnpm tsx scripts/seed-sandbox.ts` | Blank env + persona accounts | provisum-sandbox |
| `pnpm tsx scripts/bootstrap-prod.ts` | One admin user, no data | provisum-prod |
| `pnpm tsx scripts/onboard-customer.ts --org="X" --admin-email="Y"` | New customer | provisum-prod |

## Key Files

| File | Purpose |
|------|---------|
| `lib/env.ts` | `PROVISUM_ENV` detection |
| `lib/demo-mode.ts` | Demo/sandbox/prod mode logic |
| `components/layout/environment-banner.tsx` | Visual environment indicator |
| `db/index.ts` | DB connection + prod safety guard |
| `lib/validate-env.ts` | Startup env validation |

## Cost

| Resource | Monthly |
|----------|---------|
| provisum-demo (Supabase) | $10 |
| provisum-sandbox (Supabase) | $10 |
| provisum-prod (Supabase) | $10 |
| 3 Vercel projects | $0 |
| **Total** | **$30/month** |
