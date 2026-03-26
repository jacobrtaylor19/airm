# Vendor Security Assessment — Provisum

## Current Vendors

### Anthropic (AI Processing)

| Attribute | Detail |
|-----------|--------|
| **Service** | Claude API for AI-powered persona generation, mapping, and analysis |
| **Data shared** | Project statistics, role/permission descriptions, user counts. No raw PII (names, emails, social security numbers) is sent in prompts. |
| **Data retention** | Anthropic does not train on API data (per API terms of service). Inputs/outputs may be retained for up to 30 days for safety monitoring, then deleted. |
| **Compliance** | SOC 2 Type II. See Anthropic's trust center for current certifications. |
| **DPA** | Covered under Anthropic API terms of service (Data Processing Addendum available on request). |
| **Review frequency** | Annual review of terms and data practices. |

### Render (Application Hosting)

| Attribute | Detail |
|-----------|--------|
| **Service** | Web service hosting, persistent storage (EBS volumes), environment variable management |
| **Data shared** | All application data (stored on encrypted EBS volumes) |
| **Infrastructure** | AWS us-east region. Encrypted storage at rest (AES-256). Network isolation between services. |
| **Compliance** | SOC 2 Type II certified. See Render's security page. |
| **Shared responsibility** | Render manages infrastructure security (patching, network, physical). Provisum manages application security (auth, access control, data encryption). |
| **DPA** | Render DPA available at render.com/privacy. |
| **Review frequency** | Annual review of service configuration and security posture. |

---

## Vendor Evaluation Template

When evaluating new vendors, assess the following:

### Security Questionnaire

1. **Compliance certifications** — SOC 2, ISO 27001, GDPR compliance?
2. **Data handling** — What data is shared? How is it stored? Encrypted at rest and in transit?
3. **Data retention** — How long is data retained? Can it be deleted on request?
4. **Access controls** — Who at the vendor can access our data? Under what conditions?
5. **Incident response** — How quickly are customers notified of breaches?
6. **Sub-processors** — Does the vendor share data with third parties?
7. **Data location** — Where is data stored geographically?
8. **Availability** — SLA guarantees? Uptime history?

### Required Documents

- [ ] Data Processing Agreement (DPA)
- [ ] SOC 2 Type II report (or equivalent)
- [ ] Privacy policy
- [ ] Security whitepaper or trust center page
- [ ] Incident notification procedure

### Review Schedule

- **Initial assessment** before contract signing
- **Annual review** of compliance certifications and data practices
- **Triggered review** after any vendor security incident
