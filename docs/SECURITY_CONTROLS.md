# Security Controls — Provisum v0.6.0

This document maps all implemented security controls to SOC 2 Trust Service Criteria.

---

## SOC 2 Trust Service Criteria Mapping

### CC1 — Control Environment

| Control | Implementation | Evidence |
|---------|----------------|----------|
| Organizational structure | Role-based access (7-tier hierarchy) | `lib/auth.ts` ROLE_HIERARCHY |
| Security policies | Security documentation suite | `docs/security/` directory |
| Change management | CI/CD pipeline with required checks | `.github/workflows/ci.yml` |

### CC2 — Communication and Information

| Control | Implementation | Evidence |
|---------|----------------|----------|
| Audit logging | Immutable separate audit database | `db/audit-db.ts`, `lib/audit.ts` |
| Audit export | Admin export endpoint (JSON/CSV) | `/api/admin/audit-export` |
| Incident response | Documented IRP with severity classification | `docs/security/INCIDENT_RESPONSE_PLAN.md` |

### CC3 — Risk Assessment

| Control | Implementation | Evidence |
|---------|----------------|----------|
| Dependency scanning | GitHub Dependabot + pnpm audit in CI | `.github/dependabot.yml`, CI workflow |
| Vendor assessment | Documented vendor security reviews | `docs/security/VENDOR_SECURITY.md` |

### CC5 — Control Activities

| Control | Implementation | Evidence |
|---------|----------------|----------|
| Authentication | bcrypt (12 rounds), cookie-based sessions, 24h expiry | `lib/auth.ts` |
| Password policy | 12-char min, complexity requirements | `lib/password-policy.ts` |
| Account lockout | 5 attempts, 30-min lockout | Login route handler |
| Rate limiting | Per-IP login, per-user AI/bulk endpoints | `lib/rate-limit.ts` |
| Input validation | Zod schemas on all API inputs | `lib/validation/` |
| Error sanitization | No internal details in production responses | `lib/errors.ts` (safeError) |
| Encryption at rest | AES-256-GCM for sensitive settings, encrypted EBS volumes | `lib/encryption.ts` |
| Encryption in transit | HSTS, secure cookies, TLS (Render) | `middleware.ts` |
| Security headers | CSP, X-Frame-Options, X-Content-Type-Options, etc. | `middleware.ts` |
| Org-unit scoping | Data access restricted by assigned department | `lib/scope.ts` |
| Export auth guards | All export endpoints require authentication + audit log | All `/api/exports/` routes |

### CC6 — Logical and Physical Access Controls

| Control | Implementation | Evidence |
|---------|----------------|----------|
| Role-based access | 7 roles with hierarchical permissions | `lib/auth.ts` |
| Session management | httpOnly, secure, sameSite cookies | Login route, middleware |
| Admin-only routes | system_admin required for settings, user management, GDPR | Admin API routes |
| Integration auth | Bearer-token (`PROVISUM_API_KEY`) with constant-time compare on `/api/integration/*` | `lib/integration-auth.ts` |
| Webhook auth | HMAC-SHA256 signature verification on inbound webhooks | `app/api/webhooks/sentry/route.ts` |
| Integration read auditing | Every external read of `/api/integration/v1/incidents` writes an `audit_log` row (entityType=`integration`, action=`incidents.read`) | `app/api/integration/v1/incidents/route.ts` |
| Secret rotation | 90/180/365-day cadences per secret type, tracked via Vercel + 1Password | `docs/security/SECRETS_ROTATION.md` |

### CC7 — System Operations

| Control | Implementation | Evidence |
|---------|----------------|----------|
| Database backups | Daily encrypted backups with 30-day retention | `scripts/backup.sh` |
| Backup verification | Monthly integrity and row count checks | `scripts/verify-backup.sh` |
| Health monitoring | `/api/health` endpoint with DB check | `app/api/health/route.ts` |
| Monitoring stub | Sentry-ready error reporting module | `lib/monitoring.ts` |

### CC8 — Change Management

| Control | Implementation | Evidence |
|---------|----------------|----------|
| CI/CD pipeline | Build + lint + security audit on every PR | `.github/workflows/ci.yml` |
| Change categories | Standard, normal, emergency with approval levels | `docs/security/CHANGE_MANAGEMENT.md` |
| Rollback procedure | Render instant rollback + git revert + DB restore | `docs/security/CHANGE_MANAGEMENT.md` |

### A1 — Availability

| Control | Implementation | Evidence |
|---------|----------------|----------|
| Automated backups | Daily with encryption and retention | `scripts/backup.sh` |
| Restore procedure | Documented and tested | `scripts/restore.sh` |
| Health endpoint | Public, no-auth health check | `/api/health` |

### P1 — Privacy (GDPR)

| Control | Implementation | Evidence |
|---------|----------------|----------|
| Data inventory | Processing activities documented | `docs/DATA_PROCESSING_INVENTORY.md` |
| Right of access | DSAR export endpoint | `/api/admin/data-export` |
| Right to erasure | Anonymization endpoint | `/api/admin/data-deletion` |
| Data minimization | AI prompts contain statistics only, no raw PII | AI pipeline code |

---

## Control Ownership

All controls are currently owned by **Jacob Taylor** (system_admin).

## Review Schedule

- **Quarterly:** Self-assessment against this control matrix
- **Annually:** External audit or penetration test
- **On incident:** Review affected controls and update procedures
