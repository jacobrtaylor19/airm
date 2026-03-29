# Provisum — Ongoing Updates (Session State)

**Last updated:** 2026-03-28 | **Version:** v0.7.0 | **Build:** clean (zero errors, zero warnings) | **Tests:** 41 passing

---

## Latest Commit

```
c7451b3 feat: production hardening + user invite flow
```

Auto-deployed to https://demo.provisum.io via GitHub → Vercel pipeline.

---

## Owner Actions Required

These manual steps block features from going live:

| # | Action | Blocks | Status |
|---|--------|--------|--------|
| 1 | Create Sentry project at sentry.io → get DSN | Error tracking | ⬜ TODO |
| 2 | Set `NEXT_PUBLIC_SENTRY_DSN` on Vercel `airm` project | Error tracking | ⬜ TODO |
| 3 | Set `SENTRY_AUTH_TOKEN` on Vercel `airm` project | Source map uploads | ⬜ TODO |
| 4 | Set `RESEND_API_KEY` on Vercel `airm` project | User invite emails | ⬜ TODO |
| 5 | Set `NEXT_PUBLIC_APP_URL=https://demo.provisum.io` on Vercel `airm` project | Invite link URLs | ⬜ TODO |

---

## Recent Changes (This Session)

### Production Hardening
- **56 database indexes** created across all 39 tables via Supabase MCP — covers user assignments, SOD conflicts, persona mappings, permission junctions, release scoping, audit logs
- **Sentry error tracking** installed: `@sentry/nextjs` with client/server/edge configs, `global-error.tsx` boundary, `lib/monitoring.ts` wired to real Sentry calls
- **Vitest test infrastructure**: 41 smoke tests across 4 files (auth, settings, strapline, middleware) — all passing in 266ms

### User Invite Flow
- `POST /api/admin/users/invite` — create Supabase auth user + app_users + send email
- `POST /api/admin/users/invite/accept` — set password via token (no auth required)
- `POST /api/admin/users/invite/resend` — refresh expired tokens
- `POST /api/admin/users/bulk-invite` — CSV upload (max 100 rows)
- `lib/email.ts` — Resend client with `sendInviteEmail()`, graceful degradation
- `user_invites` table created in Supabase with indexes
- Setup page shows "Set Your Password" form when `?token=` param present
- Admin UI: Invite User dialog, Bulk Upload button, Resend Invite per-row action

### Resend Email Integration
- `provisum.io` domain verified in Resend
- `RESEND_API_KEY` + `NOTIFICATION_EMAIL` set on `provisum-site` Vercel project
- Sales site lead notifications live → `jacobrtaylor@gmail.com` from `Provisum <leads@provisum.io>`

### Lumen AI Chatbot
- Already built from previous sprint — added `maxDuration = 60` and "New Chat" button

### Sales Site Fixes
- Demo embed: redesigned from broken tab mockup → simulated dashboard with stat cards + progress bars
- Workflow animation: viewport trigger 0.3 → 0.05, all 5 stages now render
- Favicon already configured

### QA Bug Fixes (earlier this session)
- Login redirect race condition (BUG-001): `window.location.href` instead of `router.push`
- Dashboard timeout: `maxDuration = 60` + query parallelization + error boundary
- demo.pm account created in seed + live DB

### Tech Debt Remediation (6 of 20 items resolved)
1. Queries split: monolithic 2,125-line file → 11 domain modules
2. N+1 elimination: AI pipeline bulk loader (3 queries instead of 2000+)
3. Shared AI types extracted to `lib/ai/types.ts`
4. Middleware hardened: default-secure with exact-match Set + prefix array
5. CI audit blocking: removed `continue-on-error`
6. Scoped queries push `inArray` filter to SQL

---

## Known Issues

- **Sentry not active** — Code deployed, DSN env var not set yet (Owner Action #1-3)
- **Invite emails don't send** — Code deployed, `RESEND_API_KEY` not set on `airm` project (Owner Action #4)
- **In-memory rate limiter** — Single-instance only; Vercel runs multiple isolates
- **No staging environment** — Pushes to `main` deploy directly to production
- **Large client components** — `mapping-client.tsx` (1,286 lines), `admin-console-client.tsx` (1,234 lines) still need splitting

---

## Architecture Notes

### Middleware Auth Model (default-secure)
```
PUBLIC_EXACT = Set(["/", "/login", "/setup", "/methodology", "/overview", "/quick-reference"])
PUBLIC_PREFIXES = ["/api/auth/", "/api/health", "/review/", "/api/admin/users/invite/accept"]

Everything else → requires Supabase JWT session → redirects to /login if missing
```

### Query Module Structure
```
lib/queries/
├── index.ts          # barrel re-export (consumers import from @/lib/queries)
├── dashboard.ts      # getDashboardStats, getDepartmentMappingStatus, etc.
├── users.ts          # getUsers(filterUserIds?), getUserDetail, getAllSimpleUsers
├── personas.ts       # getPersonas, getPersonaDetail, getPersonaIdsForUsers
├── roles.ts          # getSourceRoles, getTargetRoles, role detail functions
├── sod.ts            # getSodConflicts, getSodConflictsDetailed
├── approvals.ts      # getApprovalQueue, getApprovalQueueScoped (DB-level filter)
├── mapping.ts        # getUserGapAnalysis, getUserRefinementDetails
├── risk.ts           # getLeastAccessAnalysis, getAggregateRiskAnalysis (parallelized)
├── common.ts         # getUsersScoped (DB-level filter), release scoping helpers
├── jobs.ts           # getJobs
└── audit.ts          # getAuditLog
```

### Email / Invite Architecture
```
lib/email.ts                          # Resend client, sendInviteEmail()
app/api/admin/users/invite/route.ts   # Create user + send invite
app/api/admin/users/invite/accept/    # Set password (no auth)
app/api/admin/users/invite/resend/    # Refresh token + re-send
app/api/admin/users/bulk-invite/      # CSV upload
app/setup/invite-accept-form.tsx      # Password form (client component)
db/schema.ts → userInvites            # Token storage with 24h expiry
```

### AI Pipeline Bulk Loading
```
lib/ai/types.ts              # UserAccessProfile interface
lib/ai/load-user-profiles.ts # 3 bulk queries: role assignments, role→perm junctions, permissions
                              # Assembles UserAccessProfile[] in-memory via Maps
                              # Used by both persona-generation.ts and persona-assignment.ts
```
