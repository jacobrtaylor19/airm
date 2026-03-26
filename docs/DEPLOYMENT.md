# AIRM Deployment & Operations Guide

This document covers deploying AIRM to production, configuring environments, monitoring, troubleshooting, and operational procedures.

---

## Deployment Target: Render.com

AIRM is designed for rapid deployment on Render.com. This guide assumes a Render Web Service + SQLite database approach.

### Why Render?
- **Simplicity**: GitHub push → automatic deploy (no CI/CD config)
- **Free tier**: Suitable for MVP and small migrations
- **Persistent storage**: SQLite database persists in `/data` volume across deploys
- **Environment variables**: Built-in secrets management
- **Logs**: Accessible via dashboard

---

## Initial Deployment Setup

### Prerequisites
- GitHub account with AIRM repo (public or private)
- Render.com account (free or paid plan)
- Anthropic Claude API key

### Step 1: Create Render Web Service

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click **+ New** → **Web Service**
3. Select GitHub repo (AIRM)
4. Configure:
   - **Name**: `airm` (or your preference)
   - **Environment**: `Node`
   - **Build Command**: `pnpm install && pnpm db:push && pnpm build`
   - **Start Command**: `pnpm start`
   - **Instance Type**: Free (or Starter+ for production)
5. Click **Create Web Service**

### Step 2: Configure Environment Variables

In Render dashboard, go to **Settings** → **Environment** and add:

```
NODE_ENV=production
ANTHROPIC_API_KEY=sk-ant-v4-...
DATABASE_URL=file:///data/airm.db
ENCRYPTION_KEY=<base64-encoded-32-byte-key>
BACKUP_ENCRYPTION_KEY=<passphrase-for-backup-encryption>
SENTRY_DSN=<your-sentry-dsn>
AUDIT_DATABASE_URL=/data/audit.db
```

**Generating encryption keys:**
```bash
# ENCRYPTION_KEY (AES-256-GCM for settings at rest)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# BACKUP_ENCRYPTION_KEY (OpenSSL passphrase for backup files)
# Use a strong passphrase and store securely
```

Provisum uses custom cookie-based sessions rather than NextAuth, so no `NEXTAUTH_SECRET` is needed.

> **Security note:** Render uses encrypted EBS volumes by default. Combined with field-level encryption for sensitive settings (AES-256-GCM via `ENCRYPTION_KEY`), this provides encryption at rest for all data. See `docs/SECURITY_CONTROLS.md` for details.

### Step 3: Set Up Persistent Storage

By default, Render deploys are ephemeral (files deleted on redeploy). To persist the SQLite database:

1. Go to **Settings** → **Disk**
2. Click **Add Disk**
3. Configure:
   - **Disk Name**: `airm-data`
   - **Mount Path**: `/data`
   - **Size**: 1 GB (adjust as needed)
4. Save

Make sure the `DATABASE_URL` environment variable (set in Step 2) points to `/data`:

```
DATABASE_URL=file:///data/airm.db
```

This tells AIRM to store the SQLite file inside the persistent volume rather than in the ephemeral build directory.

### Step 4: Deploy

Once environment variables and disk are configured:

1. In Render dashboard, click **Deploy latest commit**
2. Monitor logs during build (watch for `pnpm db:push` schema sync)
3. On success, you'll see "Your service is live at `https://airm-xxx.onrender.com`"

---

## Environment Configuration

### Full Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `development` or `production` |
| `ANTHROPIC_API_KEY` | Yes | Claude API key from console.anthropic.com |
| `DATABASE_URL` | Yes | SQLite path. Dev: `file:./airm.db`, Prod: `file:///data/airm.db` |
| `ENCRYPTION_KEY` | Prod | AES-256-GCM key for encrypting sensitive settings. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `BACKUP_ENCRYPTION_KEY` | Prod | Passphrase for encrypting database backup files |
| `AUDIT_DATABASE_URL` | No | Path to audit log DB. Default: `./data/audit.db` |
| `SENTRY_DSN` | No | Sentry error tracking DSN (optional) |

> **Post-deploy setup:** See `docs/POST_SPRINT_ACTION_ITEMS.md` for step-by-step instructions on configuring encryption keys, backups, Sentry, and GitHub branch protection.

### Development

```bash
# .env.local (git-ignored)
NODE_ENV=development
ANTHROPIC_API_KEY=sk-ant-v4-...
DATABASE_URL=file:./airm.db
# ENCRYPTION_KEY is optional in dev — settings stored in plaintext without it
```

Run locally:
```bash
pnpm dev
# Opens http://localhost:3000
```

### Staging

Use a second Render service pointing to the same GitHub repo but a `staging` branch.

```
Staging Render Service
├─ Connected to: github.com/your-org/airm
├─ Branch: staging
├─ Environment: (same as production)
└─ Disk: airm-staging-data (separate from production)
```

### Production

```
Production Render Service
├─ Connected to: github.com/your-org/airm
├─ Branch: main
├─ Environment: NODE_ENV=production + secrets
└─ Disk: airm-data (persistent SQLite database)
```

---

## Database Management

### Backup (Manual)

The SQLite database is stored at `/data/airm.db` on Render.

**To backup**:
1. SSH into Render service (if available on your plan)
2. Or download via Render dashboard **Logs** → file browser
3. Or set up a scheduled job to upload to S3/Google Cloud

### Restore (After Crash)

If the database is corrupted or lost:

1. Delete the broken `/data/airm.db`
2. Redeploy: Render will trigger build → `pnpm db:push` (recreates schema)
3. **Warning**: Data is lost. Restore from backup if available.

### Schema Changes

When updating the database schema:

1. Edit `db/schema.ts`
2. Push to GitHub
3. On redeploy, `pnpm db:push` runs automatically and syncs schema
4. **No migration files needed** — Drizzle handles drift detection

---

## Monitoring & Logs

### Render Logs

In Render dashboard:
- **Logs** tab shows real-time service output
- Search for errors, warnings, or specific events
- Logs are retained for 7 days (free tier) or longer (paid)

**Common log messages**:
```
[pnpm] Installed 234 packages in 45s          # Healthy build
schema drift detected, syncing...               # Schema updating (normal)
Server running on port 3000                    # Service started
```

**Error patterns**:
```
ENOENT: no such file or directory, open '/data/airm.db'  # Disk not mounted
ConnectionError: Cannot connect to ANTHROPIC_API_KEY      # API key invalid or rate-limited
```

### Health Checks

Render automatically pings `GET /` to check service is alive. Next.js serves a 200 response, so health checks should pass.

If health checks fail:
- Check logs for startup errors
- Verify environment variables are set
- Restart the service in Render dashboard

---

## Common Operations

### Redeploy Manually

If you need to redeploy without pushing to GitHub:

1. Render dashboard → **Deployments** tab
2. Find the latest successful deployment
3. Click **Redeploy**
4. Render will run the build and start commands again

### Update Environment Variable

1. **Settings** → **Environment**
2. Edit the variable (e.g., `ANTHROPIC_API_KEY`)
3. Click **Save**
4. Render will automatically restart the service

### Check Service Status

```bash
# In Render dashboard
Status: "Live" (green) = healthy
Status: "Building" (blue) = deploying
Status: "Crashed" (red) = error (check logs)
```

### View Database Size

```bash
# Estimate from logs (if SSH available)
du -h /data/airm.db
```

SQLite default is unlimited; monitor growth and plan for scaling.

---

## Performance Tuning

### Database

**Indexes** (already configured in `db/schema.ts`):
```typescript
// Example from schema
export const usersIndexByDepartment = index("users_idx_dept").on(schema.users.department);
```

**Query optimization**:
- Use `.get()` for single rows (not `.all()`)
- Avoid N+1 queries; fetch relationships in one query if possible
- Check `lib/queries.ts` for centralized, optimized queries

### Next.js Build

**Minification & Code-splitting** (automatic in Next.js 14):
- Production builds are minified
- Route-based code splitting reduces initial bundle size

**Static Generation** (use cautiously):
- Pages with `export const dynamic = "force-dynamic"` always server-render (no static caching)
- Use `revalidate` for ISR (incremental static regeneration) on read-heavy pages

### Render Tier Selection

| Tier | Cost | Cold Start | Suitable For |
|------|------|-----------|--------------|
| Free | $0/month | ~30s | Development, small pilots |
| Starter+ | $7/month | ~5s | Small production |
| Standard | $25/month | <1s | Medium-scale production |
| Pro | $50+/month | <1s | Large-scale, high SLA |

For production migrations, **Starter+ or Standard** is recommended to avoid cold starts and ensure availability.

---

## Scaling Considerations

### When AIRM Needs to Scale

Signs you're hitting limits:
- Database file > 1 GB (SQLite handles up to ~100 GB in theory, but performance degrades)
- API response times > 5s (typically indicates slow queries)
- Concurrent users > 50 (SQLite's single-writer limitation)
- Memory usage > 512 MB (Render's free tier max)

### Scaling Strategy

**Short-term** (within SQLite):
1. Add database indexes for slow queries
2. Optimize queries in `lib/queries.ts`
3. Cache frequently-accessed data (e.g., org-unit tree)

**Medium-term** (upgrade Render tier):
1. Move to **Standard** instance (more CPU, memory)
2. Increase disk size if database grows

**Long-term** (beyond SQLite):
1. Migrate to PostgreSQL (hosted on Render, Heroku, AWS RDS, etc.)
2. Add Redis for session storage and caching
3. Implement connection pooling (PgBouncer)

**Not recommended for MVP**: Immediate jump to microservices, Kubernetes, or multi-region—complexity not justified until proven product-market fit.

---

## Security Best Practices

### API Key Management

- **Never commit secrets** to Git (use `.gitignore` for `.env.local`)
- **Rotate keys regularly** (quarterly or after personnel changes)
- **Restrict API key scope** to Claude Completions API (no other scopes needed)

### Database Backup

- **Automated**: Set up Render's backup feature (if available on your plan) or implement scheduled S3 uploads
- **Manual**: Periodically download `/data/airm.db` from Render dashboard
- **Retention**: Keep backups for at least 30 days (longer for regulatory compliance)

### Access Control

- **Render dashboard**: Restrict access to team members only (use Render teams/SSO if available)
- **GitHub repository**: Use branch protection rules; require code review before merging to `main`
- **SSH to Render**: Disable or restrict to team members (if SSH is available)

### HTTPS & Encryption

- Render automatically provisions SSL/TLS certificates (HTTPS out of the box)
- `airm_session` cookies are marked `HttpOnly`, `Secure`, and `SameSite=strict`
- Database is unencrypted at rest (Render's responsibility); if sensitive data is required, encrypt before storing

---

## Troubleshooting

### Service Won't Start

**Symptom**: Status shows "Crashed" or "Failed to start"

**Steps**:
1. Check **Logs** tab for errors
2. Common causes:
   - Missing environment variable (especially `ANTHROPIC_API_KEY`)
   - Build failed (check build logs for `pnpm` or TypeScript errors)
   - Disk not mounted (check `/data` path in `DATABASE_URL`)

**Solution**:
```bash
# In logs, look for:
Error: ENOENT: no such file or directory, open '/data/airm.db'
  → Check Disk settings; ensure mount path is /data

Error: undefined variable ANTHROPIC_API_KEY
  → Add to Environment settings in Render dashboard

Error: connect ECONNREFUSED 127.0.0.1:5432
  → Check DATABASE_URL; should be file:///data/airm.db, not PostgreSQL
```

### Database File Corrupted

**Symptom**: SQL errors on every request; "database disk image is malformed"

**Steps**:
1. Backup current database (in Render, download if possible)
2. Delete `/data/airm.db`
3. Redeploy (build will trigger `pnpm db:push` to recreate schema)
4. Reset to a recent backup if available

### Slow Queries

**Symptom**: API responses > 5s; dashboard loads slowly

**Steps**:
1. Check logs for slow query warnings (enable `DEBUG=* pnpm dev` locally to see query times)
2. In `lib/queries.ts`, review queries that fetch large datasets
3. Add indexes: `export const idx = index("name").on(table.column)`
4. Optimize with `.limit()` or pagination if fetching huge result sets

### Cold Starts (Free/Starter Tier)

**Symptom**: First request after 30min inactivity takes 20–30 seconds

**Why**: Render spins down free-tier services after inactivity; first request wakes them up

**Solution**: Upgrade to **Starter+ or higher** to keep service always-on

### API Rate Limiting

**Symptom**: Occasional 429 errors from Claude API; "rate_limit_exceeded"

**Cause**: High volume of persona clustering requests or Claude API hitting rate limits

**Solution**:
1. Check Anthropic API dashboard for usage
2. Implement request batching (cluster multiple users in one API call)
3. Add exponential backoff retry logic (with jitter)
4. Upgrade Anthropic plan if rate limits are too restrictive

---

## Maintenance Schedule

### Daily
- Monitor logs for errors (automated alerts recommended)
- Check service status on Render dashboard

### Weekly
- Review database size (`du -h /data/airm.db`)
- Check for slow queries in logs
- Verify backup process is working

### Monthly
- Download database backup (manual if automated not available)
- Review and rotate API keys (if nearing rotation date)
- Test restoring from backup in staging environment

### Quarterly
- Security audit (access logs, API key usage, GitHub permissions)
- Capacity planning (database size growth trend, concurrent user count)
- Performance benchmarking (response time, database query latency)

---

## Rollback Procedure

If a bad deployment goes live, rollback quickly:

1. **Immediate**: Render dashboard → **Deployments** tab
2. Find the last good deployment (check logs to confirm it was working)
3. Click **Redeploy**
4. Monitor logs to confirm service is healthy
5. **Post-incident**: Review what went wrong; add pre-deployment checks if needed

**Prevention**:
- Require code review before merging to `main`
- Deploy to staging first; test thoroughly before promoting to production
- Use feature flags for risky features (not yet in MVP, but plan for future)

---

## Emergency Contacts

For critical issues:
- **Render support**: [support.render.com](https://support.render.com)
- **Anthropic API status**: [status.anthropic.com](https://status.anthropic.com) (if Claude API is down)
- **GitHub**: [github.com/status](https://www.githubstatus.com/) (if GitHub Actions is down)

---

## Deployment Checklist

Use this checklist before promoting to production:

- [ ] No TypeScript or lint errors locally (`pnpm build && pnpm lint`) — automated test suite not yet configured
- [ ] Code reviewed and approved
- [ ] Environment variables set in Render dashboard
- [ ] Persistent disk mounted at `/data`
- [ ] Build command includes `pnpm db:push`
- [ ] API key (ANTHROPIC_API_KEY) is valid and not rate-limited
- [ ] Staging deployment successful; smoke tests pass
- [ ] Database backup in place (if migrating from prior version)
- [ ] Team notified of deployment time
- [ ] Logs monitored during and after deploy (at least 1 hour)
- [ ] Roll-forward or rollback procedure documented

---

## Next Steps

- **Monitoring**: Set up alerts (Render's built-in alerts or third-party like Sentry)
- **CI/CD**: Add GitHub Actions to run tests on push (future enhancement)
- **Disaster Recovery**: Document backup/restore procedures; test quarterly
- **Documentation**: Keep this guide updated as deployment processes change
