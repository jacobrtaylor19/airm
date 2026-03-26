# Incident Response Plan — Provisum

## Severity Classification

| Severity | Description | Examples |
|----------|-------------|---------|
| **P1 — Critical** | Data breach, unauthorized access, data loss | Leaked credentials, unauthorized DB access, ransomware, PII exposure |
| **P2 — High** | Service outage, data integrity issues | Application down, corrupted data, failed backups, broken auth |
| **P3 — Medium** | Degraded performance, minor vulnerability | Slow queries, non-critical CVE, UI bugs affecting usability |

---

## Escalation Paths

### Current Team (Sole Founder)

| Severity | Acknowledged | Mitigated | Resolved | Escalation |
|----------|-------------|-----------|----------|------------|
| P1 | 15 minutes | 4 hours | 24 hours | External security consultant (if breach confirmed) |
| P2 | 1 hour | 8 hours | 48 hours | — |
| P3 | 4 hours | — | 1 week | — |

**Primary responder:** Jacob Taylor (system_admin)
**Contact:** Via configured notification channels

### When Team Grows

- P1: Immediately notify CTO + security lead. Assemble incident response team.
- P2: Notify on-call engineer. Escalate to CTO if not resolved in 4 hours.
- P3: Assign to next sprint. No escalation needed.

---

## Response Procedure

### 1. Detection & Triage (0–15 min)
- Identify the incident source (monitoring alert, user report, audit log anomaly)
- Classify severity (P1/P2/P3)
- Begin incident log in `docs/security/postmortems/`

### 2. Containment (15 min – 4 hr)
- **P1 — Data breach:** Rotate affected credentials, revoke sessions, block suspicious IPs via Render firewall
- **P1 — Unauthorized access:** Disable compromised accounts, audit all actions from those accounts
- **P2 — Service outage:** Check Render dashboard, roll back to last known good deploy
- **P2 — Data integrity:** Stop writes, restore from latest verified backup

### 3. Eradication
- Identify root cause
- Apply fix (patch vulnerability, update configuration, rotate secrets)
- Verify fix in staging if possible

### 4. Recovery
- Restore service to normal operation
- Verify data integrity (run `scripts/verify-backup.sh` if backup was restored)
- Monitor for recurrence (24-hour watch period)

### 5. Post-Incident Review
- Blameless postmortem within 48 hours
- Document in `docs/security/postmortems/YYYY-MM-DD-summary.md`
- Update controls and procedures as needed

---

## Communication Templates

### Internal Assessment (P1)
```
INCIDENT: [Brief description]
SEVERITY: P1
DETECTED: [timestamp]
STATUS: [Investigating / Contained / Resolved]
IMPACT: [What data/users are affected]
ACTIONS TAKEN: [Steps completed]
NEXT STEPS: [What happens next]
```

### Customer Notification (if required)
```
We identified a security incident affecting [scope]. We have [actions taken].
Your data [was/was not] affected. We are [next steps].
For questions, contact [support email].
```

### Post-Incident Summary
```
INCIDENT: [Title]
DATE: [Date range]
SEVERITY: P[1/2/3]
ROOT CAUSE: [Brief technical explanation]
IMPACT: [Users/data affected]
TIMELINE: [Key events with timestamps]
RESOLUTION: [How it was fixed]
LESSONS LEARNED: [What changes as a result]
ACTION ITEMS: [Specific follow-up tasks with owners]
```
