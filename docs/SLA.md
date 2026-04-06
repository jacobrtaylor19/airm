# Service Level Agreement (SLA)

**Effective:** April 5, 2026
**Applies to:** Provisum Professional and Enterprise plans

---

## 1. Service Availability

| Metric | Target |
|--------|--------|
| Monthly uptime | 99.5% |
| Planned maintenance window | Saturday 02:00–06:00 UTC |
| Maintenance notification | 48 hours advance notice |

**Uptime calculation:** `(Total minutes - Downtime minutes) / Total minutes * 100`

Downtime excludes: planned maintenance, force majeure, customer-caused issues, third-party service outages beyond our control.

---

## 2. Performance Targets

| Operation | Target Response Time |
|-----------|---------------------|
| Page load (dashboard, lists) | < 2 seconds |
| API endpoint response | < 500ms (p95) |
| AI persona generation (1K users) | < 5 minutes |
| AI mapping suggestions | < 10 seconds |
| SOD analysis run | < 2 minutes |
| Export generation (Excel/PDF) | < 30 seconds |
| Search and filter operations | < 1 second |

---

## 3. Data Protection

| Metric | Target |
|--------|--------|
| Recovery Point Objective (RPO) | 24 hours |
| Recovery Time Objective (RTO) | 4 hours |
| Backup frequency | Daily (automated) |
| Backup retention | 7 days (Pro), 30 days (Enterprise) |
| Data export availability | Within 24 hours of request |
| Data deletion after termination | 30 days |

---

## 4. Support Response Times

| Severity | Description | Response Time | Resolution Target |
|----------|-------------|---------------|-------------------|
| Critical (P1) | Service unavailable, data loss risk | 1 hour | 4 hours |
| High (P2) | Major feature broken, no workaround | 4 hours | 1 business day |
| Medium (P3) | Feature degraded, workaround available | 1 business day | 3 business days |
| Low (P4) | Minor issue, cosmetic, feature request | 2 business days | Next release |

**Support channels:**
- Email: support@provisum.io
- In-app: Lumen AI assistant (immediate, 24/7)
- In-app: Help center at `/help`

**Support hours:** Monday–Friday, 09:00–18:00 GMT (excluding UK bank holidays)

---

## 5. Service Credits (Enterprise Plan)

| Monthly Uptime | Credit |
|----------------|--------|
| 99.0% – 99.5% | 10% of monthly fee |
| 95.0% – 99.0% | 25% of monthly fee |
| Below 95.0% | 50% of monthly fee |

Credits must be requested within 30 days of the incident. Maximum credit per month: 50% of monthly fee. Credits are applied to future invoices, not refunded.

---

## 6. Exclusions

This SLA does not apply to:
- Free tier or trial accounts
- Features in beta or preview
- Issues caused by customer misuse or misconfiguration
- Scheduled maintenance windows
- Third-party service outages (Anthropic API, Supabase platform outages)
- Force majeure events

---

## 7. Monitoring

- **Health endpoint:** `GET /api/health` — returns database connectivity status
- **Automated monitoring:** Sentry for error tracking, automated incident detection
- **Status page:** To be published at status.provisum.io (planned)

---

## 8. Review

This SLA is reviewed quarterly. Changes are communicated 30 days in advance.
