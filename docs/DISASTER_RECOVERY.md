# Disaster Recovery Runbook

**Last updated:** April 5, 2026
**Targets:** RTO 4 hours | RPO 24 hours

---

## 1. Infrastructure Overview

| Component | Provider | Region | Backup |
|-----------|----------|--------|--------|
| Application | Vercel | Global Edge | Instant rollback via deployment history |
| Database | Supabase (AWS) | us-east-1 | Daily automated backups (Pro plan) |
| Auth | Supabase Auth | us-east-1 | Part of database backup |
| Email | Resend | US | No persistent state |
| AI | Anthropic API | US | Stateless (no backup needed) |
| Monitoring | Sentry | US | No persistent state |

---

## 2. Failure Scenarios & Response

### 2.1 Application Down (Vercel)

**Detection:** Uptime monitor alerts, `/api/health` returns non-200.

**Response:**
1. Check [Vercel Status](https://vercel-status.com) for platform-wide issues
2. Check deployment status: `vercel ls --limit 5`
3. If bad deployment: rollback via Vercel dashboard → Deployments → Promote previous
4. If Vercel-wide: wait for resolution (SLA: 99.99% uptime)

**Rollback command:**
```bash
vercel rollback <deployment-url>
```

### 2.2 Database Down (Supabase)

**Detection:** Health check fails (`/api/health` returns `database: disconnected`), incident auto-created.

**Response:**
1. Check [Supabase Status](https://status.supabase.com)
2. Verify connection string: `postgresql://postgres.anjxhleuutdcwipassij:...@aws-1-us-east-1.pooler.supabase.com:6543/postgres`
3. If pooler issue: try direct connection (port 5432) temporarily
4. If Supabase-wide: wait for resolution

**Restore from backup:**
1. Go to Supabase Dashboard → Project → Database → Backups
2. Select the most recent backup before the incident
3. Click "Restore" — this creates a new project with the restored data
4. Update `DATABASE_URL` env var in Vercel to point to the restored project
5. Redeploy: `vercel --prod`

### 2.3 Authentication Down

**Detection:** Users cannot log in, 401 errors on protected routes.

**Response:**
1. Check Supabase Auth status in the dashboard
2. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars
3. Check JWT expiry — sessions may need to be refreshed
4. If persistent: restart Supabase project (Dashboard → Settings → General → Restart)

### 2.4 AI Pipeline Down (Anthropic API)

**Detection:** Persona generation and mapping suggestions fail, 500 errors from AI routes.

**Impact:** Limited — core workflow (manual mapping, approvals) continues to work. Only AI features affected.

**Response:**
1. Check [Anthropic Status](https://status.anthropic.com)
2. Verify `ANTHROPIC_API_KEY` is valid and not rate-limited
3. AI features degrade gracefully — users see "AI unavailable" messaging

### 2.5 Data Corruption

**Detection:** Unexpected data in queries, UI showing wrong counts or broken references.

**Response:**
1. Identify affected tables using audit log: check `/admin` → Audit Log
2. Use point-in-time recovery (Supabase Pro): Dashboard → Backups → PITR
3. For targeted fix: use Supabase SQL Editor to correct specific rows
4. Re-run data integrity checks via `/admin/validation`

### 2.6 Security Incident (Unauthorized Access)

**Response:**
1. Immediately revoke compromised credentials
2. Review audit log for scope of unauthorized actions
3. If API key compromised: rotate in Vercel env vars + redeploy
4. If database credentials compromised: rotate via Supabase Dashboard → Settings → Database
5. Notify affected customers within 72 hours (GDPR requirement)
6. File incident report per `docs/INCIDENT_RESPONSE.md`

---

## 3. Secrets Rotation Schedule

| Secret | Location | Rotation | Procedure |
|--------|----------|----------|-----------|
| `DATABASE_URL` | Vercel | On compromise | Supabase Dashboard → Settings → Database → Reset password |
| `ANTHROPIC_API_KEY` | Vercel | Quarterly | Anthropic Console → API Keys → Create new → Update Vercel |
| `ENCRYPTION_KEY` | Vercel | On compromise | Generate new: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` — requires re-encryption of stored settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel | On compromise | Supabase Dashboard → Settings → API → Regenerate |
| `RESEND_API_KEY` | Vercel | Annual | Resend Dashboard → API Keys → Create new |
| `CRON_SECRET` | Vercel | Annual | Generate UUID, update Vercel env var |
| `SENTRY_AUTH_TOKEN` | Vercel | Annual | Sentry → Settings → Auth Tokens → Create |

After rotating any secret:
1. Update the env var in Vercel: `vercel env rm <NAME> production && vercel env add <NAME> production`
2. Redeploy: `vercel --prod`
3. Verify with health check: `curl https://app.provisum.io/api/health`

---

## 4. Backup Verification

**Monthly procedure:**
1. Confirm daily backups are running: Supabase Dashboard → Backups → verify timestamps
2. Download latest backup export (if available on plan)
3. Document last verified restore date in this file

**Last verified restore:** _Not yet performed — schedule for first production use_

---

## 5. Communication Template

**For customer-facing incidents:**

```
Subject: [Provisum] Service Disruption — [Date]

We are experiencing [brief description]. Our team is actively investigating.

Impact: [What users cannot do]
Status: [Investigating / Identified / Monitoring / Resolved]
ETA: [If known]

We will provide updates every [30 minutes / 1 hour].

— Provisum Team
```

---

## 6. Escalation Path

1. **L1 — Automated:** Health check detects → incident created → admin email sent
2. **L2 — On-call:** Check Sentry, Vercel logs, Supabase dashboard
3. **L3 — Vendor:** Supabase support (Pro plan), Vercel support, Anthropic support

---

## 7. Post-Incident

1. Update incident record in `/admin/incidents` with resolution
2. Write post-mortem (use `docs/INCIDENT_RESPONSE.md` template)
3. Update this runbook if a new scenario was discovered
4. Implement preventive measures within 1 sprint
