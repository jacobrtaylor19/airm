# On-Call Runbook

**Last updated:** April 5, 2026
**Product:** Provisum v1.3.0
**Prod URL:** https://app.provisum.io
**Demo URL:** https://demo.provisum.io

---

## 1. On-Call Overview

### Responsibilities

The on-call engineer is responsible for:

- Monitoring alerts from Sentry, Vercel, and Supabase
- Triaging incoming incidents against the severity matrix (Section 2)
- Executing playbooks for known failure modes (Section 3)
- Escalating to vendors or leadership when resolution exceeds capability or SLA timelines
- Documenting actions taken during the shift

### Escalation Contacts

| Level | Who | When |
|-------|-----|------|
| L1 — On-Call | Current on-call engineer | First responder for all alerts |
| L2 — Engineering Lead | Jacob (project owner) | P1/P2 not resolved within 30 min |
| L3 — Vendor Support | Supabase Pro support, Vercel support, Anthropic support | Platform-level outages beyond our control |

### Shift Handoff Procedure

1. Outgoing engineer writes a brief handoff note covering:
   - Any active or recently resolved incidents
   - Ongoing investigations or things to watch
   - Anything unusual in metrics or logs
2. Incoming engineer confirms receipt and checks:
   - Sentry for new unresolved errors
   - Vercel deployment status (latest deploy healthy?)
   - `/api/health` returns `{"status":"ok","components":{"database":"connected"}}`
3. Update the on-call roster/channel with the new primary contact

---

## 2. Alert Triage

### Severity Matrix (aligned with SLA.md)

| Severity | Description | Response Time | Resolution Target | Examples |
|----------|-------------|---------------|-------------------|----------|
| **P1 — Critical** | Service unavailable, data loss risk | 1 hour | 4 hours | App fully down, database unreachable, auth system broken for all users |
| **P2 — High** | Major feature broken, no workaround | 4 hours | 1 business day | AI pipeline completely failing, SOD analysis broken, export generation down |
| **P3 — Medium** | Feature degraded, workaround available | 1 business day | 3 business days | Slow page loads, intermittent email failures, one cron job failing |
| **P4 — Low** | Minor issue, cosmetic | 2 business days | Next release | UI glitch, non-critical log noise, minor display error |

### Triage Decision Tree

```
Alert received
  |
  +-- Can users log in?
  |     NO --> P1. Go to: Auth Failures Playbook (3.3)
  |     YES
  |       |
  |       +-- Is /api/health returning 200?
  |             NO --> P1. Go to: 500 Errors Playbook (3.1) or DB Failures (3.2)
  |             YES
  |               |
  |               +-- Is core workflow broken (mapping, approvals, SOD)?
  |                     YES --> P2. Investigate specific feature.
  |                     NO
  |                       |
  |                       +-- Is it AI-only (persona gen, suggestions)?
  |                       |     YES --> P3. Go to: AI Pipeline Playbook (3.4)
  |                       |
  |                       +-- Is it background (cron, email, webhooks)?
  |                       |     YES --> P3. Go to: Cron (3.6) or Email (3.7)
  |                       |
  |                       +-- Is it performance-related?
  |                       |     YES --> P3. Go to: High Latency Playbook (3.5)
  |                       |
  |                       +-- Otherwise --> P4. Log and address in next sprint.
```

---

## 3. Common Scenarios & Playbooks

### 3.1 App Returns 500 Errors

**Symptoms:** Users see error pages, Sentry fires new error alerts, `/api/health` may still return 200 (if only specific routes are affected).

**Steps:**

1. **Check Sentry** for the specific error and stack trace
   - Look at the error message, affected route, and frequency
   - Check if it started after a recent deployment
2. **Check Vercel function logs** for the failing route
   - Vercel Dashboard > Project `airm` > Logs > filter by 500 status
3. **If caused by a bad deploy:**
   - Rollback: Vercel Dashboard > Deployments > click the previous healthy deployment > Promote to Production
   - Or CLI: `vercel rollback <previous-deployment-url>`
4. **If caused by a code bug** (not deployment-related):
   - Identify the fix, push to main, let auto-deploy run
   - If urgent: `vercel --prod` to force-deploy from local
5. **If Vercel platform issue:**
   - Check [vercel-status.com](https://vercel-status.com)
   - Wait for resolution; Vercel SLA is 99.99%

**Verify recovery:** `curl -s https://app.provisum.io/api/health | jq .`

---

### 3.2 Database Connection Failures

**Symptoms:** `/api/health` returns `{"status":"degraded","components":{"database":"disconnected"}}`, pages fail to load data, Sentry shows connection errors.

**Steps:**

1. **Check Supabase status:** [status.supabase.com](https://status.supabase.com)
2. **Check the Supabase dashboard** for project `anjxhleuutdcwipassij`:
   - Database health indicators
   - Connection count (are we hitting the pooler limit?)
   - Any active maintenance notices
3. **Verify the connection string** hasn't changed:
   - Host must be `aws-1-us-east-1.pooler.supabase.com` (NOT `aws-0`)
   - Port must be `6543` (pooler/transaction mode)
   - If pooler is down, try direct connection on port `5432` temporarily
4. **If connection limit exhaustion:**
   - Check for connection leaks (long-running queries in Supabase SQL Editor)
   - Restart the Supabase project if needed: Dashboard > Settings > General > Restart project
5. **If Supabase-wide outage:**
   - Wait for resolution
   - Consider enabling a maintenance page if extended
6. **If database needs restore:**
   - Follow `docs/DISASTER_RECOVERY.md` Section 2.2

**Verify recovery:** `curl -s https://app.provisum.io/api/health | jq .`

---

### 3.3 Auth / Login Failures

**Symptoms:** Users cannot log in, 401 errors on protected routes, session cookies not being set.

**Steps:**

1. **Check Supabase Auth** in the dashboard:
   - Auth > Users — can you see the user list?
   - Any error banners in the Supabase console?
2. **Check env vars** on Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL` — must point to correct project
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — must match project
   - `SUPABASE_SERVICE_ROLE_KEY` — must match project
3. **JWT / session issues:**
   - Sessions are managed by `@supabase/ssr` with httpOnly cookies
   - If tokens are expiring unexpectedly, check Supabase Auth settings (JWT expiry config)
   - Clear the user's cookies and have them re-login
4. **Account lockout:**
   - 5 failed attempts triggers a 5-minute lockout (in-memory, per-account)
   - This resets on server restart (Vercel function cold start)
   - If a user is locked out, wait 5 minutes or redeploy to reset
5. **If Supabase Auth is down:**
   - Check [status.supabase.com](https://status.supabase.com)
   - Restart Supabase project: Dashboard > Settings > General > Restart project

**Verify recovery:** Try logging in with `demo.admin` / `DemoGuide2026!`

---

### 3.4 AI Pipeline Failures

**Symptoms:** Persona generation fails, AI mapping suggestions return errors, Lumen chatbot unresponsive.

**Impact:** Limited. Core workflow (manual mapping, approvals, SOD analysis) continues. Only AI-powered features affected.

**Steps:**

1. **Check Anthropic API status:** [status.anthropic.com](https://status.anthropic.com)
2. **Check Sentry** for specific error details:
   - 429 = rate limited — back off and retry
   - 401 = API key invalid — verify `ANTHROPIC_API_KEY` on Vercel
   - 500 = Anthropic server error — wait for resolution
3. **Check rate limits:**
   - AI pipeline routes have `maxDuration = 300` for Vercel
   - Persona generation processes 100-user samples; large batches may hit token limits
4. **Fallback behavior:**
   - AI features degrade gracefully — users see "AI unavailable" messaging
   - Manual mapping and all non-AI workflows remain functional
   - Lumen chatbot will show an error state but won't block navigation
5. **If API key needs rotation:**
   - Anthropic Console > API Keys > Create new key
   - Update `ANTHROPIC_API_KEY` in Vercel env vars
   - Redeploy: `vercel --prod`

**Verify recovery:** Check `/api/health` (doesn't cover AI), then manually trigger a small AI suggestion from the mapping page.

---

### 3.5 High Latency

**Symptoms:** Pages take >2s to load, API responses >500ms (p95), users reporting slowness.

**Steps:**

1. **Check Vercel function duration** in the dashboard:
   - Functions > look for high execution times
   - Cold starts are normal for the first request after idle (2-5s)
2. **Check Supabase query performance:**
   - Dashboard > Database > Query Performance
   - Look for slow queries (>1s)
   - Check if any table is missing indexes (56 indexes exist, but new queries may need more)
3. **Known heavy pages** (normal to be slower):
   - `/mapping` — loads user gap analysis across all personas
   - `/sod` — loads all SOD conflicts with joins
   - `/calibration` — loads confidence distribution data
   - `/admin/validation` — runs 10+ parallel queries
   - `/risk-analysis` — runs parallelized bulk queries
   - These pages have `maxDuration = 60` set
4. **Check for N+1 patterns:**
   - If a new feature was deployed, check if it introduced sequential DB calls
   - Queries should be parallelized with `Promise.all()` where possible
5. **If Vercel cold starts are the issue:**
   - This is expected behavior on serverless
   - For critical paths, consider if the function size can be reduced
6. **If DB is the bottleneck:**
   - Check connection pool saturation in Supabase
   - Look for lock contention or long-running transactions

---

### 3.6 Cron Job Failures

**Symptoms:** Scheduled exports not running, `/api/cron/exports` returning errors.

**Steps:**

1. **Check Vercel cron logs:**
   - Vercel Dashboard > Project > Cron Jobs
   - Look at recent invocations and their status
2. **Verify `CRON_SECRET`:**
   - The cron endpoint is secured by the `CRON_SECRET` env var
   - Vercel sends this automatically in the `Authorization` header
   - If it was rotated recently, make sure Vercel has the new value
3. **Check the scheduled exports table:**
   - Look at `scheduled_exports` for `last_status` and `next_run_at`
   - If `last_status` is `failed`, check the error message
4. **Manual trigger for testing:**
   ```bash
   curl -X POST https://app.provisum.io/api/cron/exports \
     -H "Authorization: Bearer <CRON_SECRET>"
   ```
5. **If the export itself fails** (not the cron trigger):
   - Check if the underlying data queries are working
   - Check disk/memory limits on the Vercel function

---

### 3.7 Email Delivery Failures

**Symptoms:** Users not receiving notification emails, invite emails not arriving, test emails failing in admin console.

**Steps:**

1. **Check Resend dashboard:** [resend.com/emails](https://resend.com/emails)
   - Look at delivery status (delivered, bounced, dropped)
   - Check for domain verification issues
2. **Verify `RESEND_API_KEY`** on Vercel:
   - If the key was rotated, redeploy after updating
3. **Check email configuration:**
   - Admin Console > Email tab has configurable from/reply-to addresses
   - Verify the sending domain is verified in Resend
4. **Test email delivery:**
   - Use the "Send test email" button in Admin Console > Email tab
   - Or directly via the app's notification system
5. **Note:** Email is fire-and-forget in this app. Email failures do NOT block core workflow. Notifications are always stored in the database regardless of email delivery.

---

### 3.8 Rate Limit Triggers

**Symptoms:** Users getting 429 responses, rate limit entries in logs.

**Steps:**

1. **Identify the source:**
   - Check Vercel function logs filtered by 429 status
   - Look for patterns: single IP, single user, or distributed
2. **Assess if it's legitimate traffic or abuse:**
   - A user rapidly clicking buttons = likely legitimate (rate limit is protecting the system correctly)
   - Automated requests from unknown IPs = potential abuse
3. **For legitimate users hitting limits:**
   - Rate limits are in-memory per function instance
   - Guide the user to slow down or wait briefly
4. **For abuse patterns:**
   - Check if the IP is hitting multiple endpoints
   - Consider adding the IP to a block list at the Vercel/middleware level
   - Review middleware rate limit configuration in `middleware.ts`

---

## 4. Useful Commands & URLs

### Dashboards

| Service | URL |
|---------|-----|
| **Vercel** (deployments, logs, env vars) | [vercel.com/team_fEadrGrB1ys7beUytc8Eh5bw/airm](https://vercel.com/team_fEadrGrB1ys7beUytc8Eh5bw/airm) |
| **Supabase** (database, auth, logs) | [supabase.com/dashboard/project/anjxhleuutdcwipassij](https://supabase.com/dashboard/project/anjxhleuutdcwipassij) |
| **Sentry** (errors, performance) | Sentry dashboard (org: provisum, project: javascript-nextjs) |
| **Resend** (email delivery) | [resend.com/emails](https://resend.com/emails) |
| **Anthropic** (API usage, rate limits) | [console.anthropic.com](https://console.anthropic.com) |

### Status Pages

| Service | URL |
|---------|-----|
| Vercel | [vercel-status.com](https://vercel-status.com) |
| Supabase | [status.supabase.com](https://status.supabase.com) |
| Anthropic | [status.anthropic.com](https://status.anthropic.com) |

### Health Check

```bash
# Quick health check
curl -s https://app.provisum.io/api/health | jq .
# Expected: {"status":"ok","components":{"database":"connected"}}

# Demo instance
curl -s https://demo.provisum.io/api/health | jq .
```

### Key API Routes to Test

```bash
# Health (public)
curl -s https://app.provisum.io/api/health

# Auth test (should return 401 if not authenticated)
curl -s https://app.provisum.io/api/notifications

# Cron endpoint (requires CRON_SECRET)
curl -s -X POST https://app.provisum.io/api/cron/exports \
  -H "Authorization: Bearer <CRON_SECRET>"
```

### Vercel CLI Commands

```bash
# List recent deployments
vercel ls --limit 5

# Check deployment logs
vercel logs <deployment-url>

# Rollback to previous deployment
vercel rollback <deployment-url>

# Force redeploy from local
vercel --prod

# Check/update env vars
vercel env ls production
vercel env rm <NAME> production
vercel env add <NAME> production
```

### Useful In-App Pages (require login)

| Page | Purpose |
|------|---------|
| `/admin` | Admin console — system overview, feature flags, webhooks, exports |
| `/admin/incidents` | Incident management with AI triage |
| `/admin/validation` | Pipeline validation dashboard |
| `/admin/migration-health` | Migration health KPIs |

---

## 5. Post-Incident Process

### Immediate (within 1 hour of resolution)

1. Update the incident record in `/admin/incidents` with:
   - Resolution description
   - Root cause (if known)
   - Time to detect, time to resolve
2. Send a brief "all clear" to affected stakeholders
3. Verify all services are healthy (run health check, spot-check key pages)

### Within 24 Hours

Write a post-incident report using this template:

```markdown
# Incident Report: [Title]

**Date:** YYYY-MM-DD
**Severity:** P1/P2/P3/P4
**Duration:** HH:MM (from detection to resolution)
**Author:** [On-call engineer]

## Summary
[1-2 sentence description of what happened and the user impact.]

## Timeline (all times UTC)
- HH:MM — [Alert received / issue detected]
- HH:MM — [Investigation started]
- HH:MM — [Root cause identified]
- HH:MM — [Fix applied]
- HH:MM — [Service restored]
- HH:MM — [Monitoring confirmed stable]

## Root Cause
[What broke and why. Be specific — "the database connection pool was exhausted
because a new query was holding connections open" not "database issues."]

## Impact
- Users affected: [count or percentage]
- Features affected: [list]
- Data loss: [yes/no, details if yes]
- SLA impact: [minutes of downtime, credit implications]

## Resolution
[What was done to fix it. Include commands run, configs changed, code deployed.]

## Action Items
| Item | Owner | Due Date | Status |
|------|-------|----------|--------|
| [Preventive measure] | [Name] | [Date] | Open |
| [Monitoring improvement] | [Name] | [Date] | Open |
| [Update runbook if applicable] | [Name] | [Date] | Open |
```

### Blameless Review Checklist

Within 3 business days, hold a review meeting. Focus on the system, not individuals.

- [ ] Did our monitoring detect this fast enough? If not, what alert should we add?
- [ ] Was the runbook helpful? Does it need updating for this scenario?
- [ ] Did the on-call engineer have the access and tools needed to resolve this?
- [ ] Could this have been prevented by better testing, code review, or deployment checks?
- [ ] Are there similar failure modes we should proactively address?
- [ ] Do we need to update `docs/DISASTER_RECOVERY.md` or `docs/SLA.md`?
- [ ] Have we scheduled all action items in the next sprint?

### Filing the Report

1. Save the incident report in `docs/incidents/YYYY-MM-DD-brief-title.md`
2. Update the incident record in `/admin/incidents` with a link to the report
3. Update this runbook if a new scenario was discovered (Section 3)
4. Implement preventive measures within 1 sprint
