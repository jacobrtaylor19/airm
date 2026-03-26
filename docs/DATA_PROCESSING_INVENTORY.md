# Data Processing Inventory — Provisum

This document records what personal data Provisum processes, why, and how long it is retained. It supports GDPR Article 30 (Records of Processing Activities).

---

## Personal Data Collected

| Data Category | Examples | Source | Purpose | Legal Basis |
|--------------|---------|--------|---------|-------------|
| App user accounts | Username, display name, email | User input at setup/creation | Authentication and access control | Legitimate interest (platform operation) |
| SAP user identifiers | User ID, full name, department, job title | CSV/Excel upload from source system | Role mapping and persona analysis | Legitimate interest (migration project) |
| Transaction codes | T-code IDs, descriptions | CSV/Excel upload from source system | Permission analysis and SOD detection | Legitimate interest (compliance) |
| Role assignments | User-to-role mappings | CSV/Excel upload from source system | Migration planning | Legitimate interest (migration project) |
| Session tokens | Random UUID tokens | System-generated | Maintain authenticated sessions | Legitimate interest (security) |
| Audit trail | Actor email, action, timestamp, IP address | System-generated on every state change | Compliance and incident investigation | Legal obligation (SOC 2 requirements) |

---

## Retention Periods

| Data Type | Retention Period | Deletion Method |
|-----------|-----------------|-----------------|
| Project data (users, roles, personas, mappings) | Duration of migration project + 1 year | Database deletion or GDPR erasure endpoint |
| Audit log entries | 2 years from creation | Automatic purge (planned) or manual deletion |
| Session tokens | 24 hours (auto-expire) | Automatic cleanup on login and expiry |
| Encrypted backups | 30 days | Automatic pruning by backup script |

---

## Data Processors

| Processor | Service | Data Shared | Retention | DPA Status |
|-----------|---------|-------------|-----------|------------|
| Anthropic | Claude AI API | Project statistics, role descriptions, user counts (no raw PII in prompts) | Not retained for training (per Anthropic API policy) | Standard API terms |
| Render | Application hosting | All application data (encrypted at rest on EBS volumes) | Duration of service | Render DPA available |

---

## Data Subject Rights

### Right of Access (Article 15)
- Endpoint: `POST /api/admin/data-export` with `{ userId: <number> }`
- Returns: JSON file containing all data associated with the user
- Access: system_admin role required

### Right to Erasure (Article 17)
- Endpoint: `POST /api/admin/data-deletion` with `{ userId: <number>, confirm: true }`
- Effect: Anonymizes PII (name, email, username), deactivates account, deletes sessions and notifications
- Preserves: Structural data (mappings, approvals) with anonymized references for audit integrity
- Audit log entries are NOT deleted (legal retention requirement)
- Access: system_admin role required

### Right to Rectification (Article 16)
- Users can update their display name and email through the admin user management UI
- Access: admin or system_admin role required

### Right to Data Portability (Article 20)
- The data export endpoint returns machine-readable JSON
- Export and GRC integration endpoints provide data in standard formats (Excel, SailPoint, SAP GRC, ServiceNow)

---

## Data Flow Summary

```
Source System (SAP ECC)
  → CSV/Excel upload → Provisum Database (SQLite, encrypted volume)
    → AI Analysis → Anthropic API (statistics only, no PII)
    → Audit Log → Separate SQLite database (immutable)
    → Exports → Excel/PDF/GRC formats (authenticated, audit-logged)
    → Backups → Encrypted files (AES-256-CBC, 30-day retention)
```
