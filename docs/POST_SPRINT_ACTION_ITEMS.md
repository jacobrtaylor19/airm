# Post-Sprint Action Items — v0.6.0 Security Compliance Hardening

These items require manual action and cannot be completed autonomously.

---

## 1. Generate and Set ENCRYPTION_KEY

**Why:** Enables AES-256-GCM encryption of sensitive settings (API keys, tokens) at rest in the database.

### Local Development
```bash
# Generate the key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Add to your .env.local file
echo 'ENCRYPTION_KEY=<paste-output-here>' >> airm/.env.local
```

### Production (Render)
1. Go to [Render Dashboard](https://dashboard.render.com) → your Provisum service
2. Click **Environment** → **Add Environment Variable**
3. Key: `ENCRYPTION_KEY`
4. Value: paste the base64 string from the generate command above
5. Click **Save Changes** → triggers redeploy
6. On first boot, `migrateSettings()` will automatically encrypt any existing plaintext sensitive values

---

## 2. Generate and Set BACKUP_ENCRYPTION_KEY

**Why:** Encrypts database backup files stored on disk.

### Production (Render)
1. Choose a strong passphrase (or generate one):
   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
   ```
2. Go to Render Dashboard → **Environment** → **Add Environment Variable**
3. Key: `BACKUP_ENCRYPTION_KEY`
4. Value: paste the passphrase
5. Click **Save Changes**

---

## 3. Set Up Daily Backup Cron Job

**Why:** Automates daily encrypted database backups with 30-day retention.

### Option A: Render Cron Job
1. Go to Render Dashboard → **+ New** → **Cron Job**
2. Configure:
   - **Name:** `provisum-daily-backup`
   - **Schedule:** `0 2 * * *` (daily at 2:00 AM UTC)
   - **Command:** `cd /opt/render/project/src/airm && bash scripts/backup.sh`
   - **Environment:** same environment group as the web service
3. Ensure `DATABASE_PATH`, `BACKUP_ENCRYPTION_KEY` env vars are available to the cron job

### Option B: Shell Script on Server
If Render Cron Jobs aren't available on your plan, add to your start command:
```bash
# In Render Build Command, append:
&& echo "0 2 * * * cd /opt/render/project/src/airm && bash scripts/backup.sh" | crontab -
```

### Monthly Verification
Run manually once a month to verify backups are restorable:
```bash
bash scripts/verify-backup.sh
```

---

## 4. Set AUDIT_DATABASE_URL (Optional)

**Why:** Controls where the separate immutable audit log database is stored. Defaults to `./data/audit.db`.

### Production (Render)
1. Go to Render Dashboard → **Environment** → **Add Environment Variable**
2. Key: `AUDIT_DATABASE_URL`
3. Value: `/data/audit.db` (on the persistent volume)
4. Click **Save Changes**

> If you skip this step, the audit DB defaults to `./data/audit.db` which is fine for most setups.

---

## 5. Set Up Sentry Error Tracking

**Why:** Captures production errors with stack traces, breadcrumbs, and context. The `lib/monitoring.ts` stub is ready.

### Steps
1. Create a Sentry account at [sentry.io](https://sentry.io) (free tier available)
2. Create a new project → select **Next.js**
3. Copy the DSN (looks like `https://abc123@o123456.ingest.sentry.io/1234567`)
4. Install Sentry:
   ```bash
   cd airm
   pnpm add @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```
5. Add DSN to Render:
   - Key: `SENTRY_DSN`
   - Value: paste the DSN
6. Update `lib/monitoring.ts` — uncomment the Sentry import and `captureException` call

---

## 6. Configure GitHub Branch Protection

**Why:** Prevents unreviewed code from reaching production.

### Steps
1. Go to your GitHub repo → **Settings** → **Branches**
2. Click **Add branch protection rule**
3. Branch name pattern: `main`
4. Enable:
   - [x] Require status checks to pass before merging
   - [x] Require branches to be up to date before merging
   - Select status checks: `build-and-test`, `security-scan`
   - [x] Require a pull request before merging (when team grows)
5. Click **Create**

---

## 7. Update Existing User Passwords

**Why:** The new password policy requires 12+ characters with complexity. Existing users with weak passwords can still log in but should update their passwords.

### Steps
1. Log in as `system_admin`
2. Notify all users to update their passwords via the new `/api/auth/change-password` endpoint
3. Alternatively, reset passwords through the admin user management UI
4. The new policy is enforced on:
   - New account creation (setup, admin user creation)
   - Password changes
   - It does NOT retroactively reject existing weak passwords at login (by design, to avoid lockouts)

---

## 8. Push to GitHub

**Why:** Activates the CI/CD pipeline and Dependabot.

```bash
cd airm
git push origin main
```

After pushing:
- GitHub Actions CI will run on the push (build + lint + security audit)
- Dependabot will start scanning for dependency updates within 24 hours
- Verify CI passes at: `https://github.com/<your-org>/airm/actions`

---

## Summary Checklist

| # | Action | Priority | Time |
|---|--------|----------|------|
| 1 | Set ENCRYPTION_KEY | **Required** | 2 min |
| 2 | Set BACKUP_ENCRYPTION_KEY | **Required** | 2 min |
| 3 | Set up backup cron job | **Required** | 10 min |
| 4 | Set AUDIT_DATABASE_URL | Optional | 2 min |
| 5 | Set up Sentry | Recommended | 15 min |
| 6 | Configure branch protection | Recommended | 5 min |
| 7 | Notify users to update passwords | Recommended | 5 min |
| 8 | Push to GitHub | **Required** | 1 min |
