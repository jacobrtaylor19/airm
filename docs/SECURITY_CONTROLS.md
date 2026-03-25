# Security Controls — Provisum v0.6.0

This document summarizes all security controls implemented as part of the SOC 2 Type I readiness sprint.

---

## Data Encryption

### Encryption at Rest

| Layer | Control | Implementation |
|-------|---------|----------------|
| Storage Volume | Render uses encrypted EBS volumes by default | Platform-level control (Render infrastructure) |
| Sensitive Settings | AES-256-GCM field-level encryption | `lib/encryption.ts` — all API keys, tokens, and secrets in `system_settings` table |
| Session Tokens | Stored as cryptographically random UUIDs | `crypto.randomUUID()` with 24h expiry |
| Passwords | bcrypt with 12 rounds | `lib/auth.ts` — one-way hash, never stored in plaintext |

### Encryption in Transit

| Control | Implementation |
|---------|----------------|
| HTTPS enforcement | HSTS header (`max-age=31536000; includeSubDomains`) in production |
| Secure cookies | `httpOnly`, `secure` (production), `sameSite: lax` |

### Future Enhancement

Full-database encryption via SQLCipher is planned for the PostgreSQL migration. The current approach (encrypted storage volume + field-level encryption for sensitive columns) provides equivalent protection for the SQLite deployment model.

---

## Evidence Collection Guide

| Control | Evidence Location |
|---------|------------------|
| Encryption at rest | Query `system_settings` table — sensitive values are ciphertext |
| Security headers | Browser DevTools → Network → Response Headers |
| Audit log | `audit.db` — immutable append-only database |
| Rate limiting | Application logs showing 429 responses |
| Password policy | Attempt weak password via API — returns 400 with policy errors |
| Account lockout | 5 failed logins → 30-minute lockout with 429 response |
| Input validation | Send malformed request → structured 400 error |
| Error sanitization | Trigger server error → generic message with correlation ID |
| Backups | `/data/backups/` directory with encrypted `.enc` files |
| CI/CD | GitHub Actions workflow passing on main branch |

---

## Control Ownership

All controls are currently owned by **Jacob Taylor** (system_admin).

Review schedule: Quarterly self-assessment, annual external audit.
