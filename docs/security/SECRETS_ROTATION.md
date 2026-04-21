# Secrets Rotation Policy

**Owner:** Jacob Taylor (system_admin)
**Review cadence:** Quarterly
**Maps to:** SOC 2 CC6 (Logical Access), CC6.1 (Physical and logical access security software, infrastructure, and architectures over protected information assets)

---

## 1. Scope

This policy covers every long-lived secret stored in Vercel environment variables on the `provisum-prod`, `provisum-demo`, and `provisum-sandbox` projects. Short-lived secrets (Supabase JWT session cookies, OIDC tokens issued per-deploy) are out of scope — they rotate automatically.

## 2. Rotation cadences

| Secret | Cadence | Rationale | Rotation owner |
|---|---|---|---|
| `PROVISUM_API_KEY` | **90 days** | Superuser scope (reads incidents across all orgs); shared with management-suite | system_admin |
| `SENTRY_WEBHOOK_SECRET` | **180 days** | Inbound-only (Sentry → Provisum); compromise requires Sentry-side compromise too | system_admin |
| `CRON_SECRET` | **180 days** | Limits unauthorized cron-job triggering | system_admin |
| `ENCRYPTION_KEY` | **Annually + on suspected compromise** | Rotating requires re-encrypting `system_settings` rows; do NOT rotate casually | system_admin |
| `SUPABASE_SERVICE_ROLE_KEY` | **Annually + on suspected compromise** | Rotation managed via Supabase dashboard; requires Vercel env update | system_admin |
| `RESEND_API_KEY` | **Annually** | Outbound-only; low blast radius | system_admin |
| `ANTHROPIC_API_KEY` | **Annually + on suspected compromise** | Outbound-only; usage-monitored via Anthropic console | system_admin |
| `SENTRY_AUTH_TOKEN` | **Annually** | Build-time only (source-map upload); no runtime use | system_admin |

## 3. Rotation procedure (per secret)

The standard pattern, using `PROVISUM_API_KEY` as the example:

```bash
# 1. Generate new secret locally
NEW_KEY=$(openssl rand -base64 32)

# 2. Set as new value on Vercel prod (replaces existing)
cd <scratch-dir>
vercel link --yes --project provisum-prod --scope team_fEadrGrB1ys7beUytc8Eh5bw
printf '%s' "$NEW_KEY" | vercel env add PROVISUM_API_KEY production --force

# 3. Trigger redeploy (env changes take effect on next deploy only)
vercel --prod --scope team_fEadrGrB1ys7beUytc8Eh5bw

# 4. Update 1Password item with the new value
# 5. Notify downstream consumer(s) — for PROVISUM_API_KEY, that's the management suite
# 6. Confirm consumer is using the new key, then revoke any record of the old one
```

For `SENTRY_WEBHOOK_SECRET`, also update the Client Secret on the Sentry Internal Integration after step 3.

## 4. Out-of-band rotation triggers

Rotate **immediately**, regardless of cadence, if any of the following occur:

- Suspected key exposure (committed to git, posted in chat, leaked in logs)
- Departure of any person who had access to the 1Password vault containing the secret
- Confirmed or suspected compromise of any system that consumed the secret
- A SOC 2 audit finding that flags the secret

## 5. Tracking

Rotation events are recorded in two places:

1. **Vercel env var "last updated" timestamp** — visible in `vercel env ls production` output. This is the primary audit trail.
2. **The corresponding 1Password item** — version history shows when the value last changed.

## 6. Future improvements (not yet implemented)

- Automated rotation reminders (Vercel Cron job that posts to Slack 7 days before each cadence elapses).
- Per-org `PROVISUM_API_KEY` so a single rotation doesn't break every consumer simultaneously.
- Secret-scanning hook on git push to catch accidental commits before they land.

---

**Last reviewed:** 2026-04-20
**Next review due:** 2026-07-20
