# Provisum Demo Script

**Duration:** 15–20 minutes
**URL:** https://airm-npt8.onrender.com
**Login:** `admin` / `AdminPass@2026!`

---

## Opening (1 min)

**Start on the landing page (logged out).**

> "This is Provisum — an AI-powered platform for managing security role mappings during enterprise ERP migrations. Whether you're moving from SAP ECC to S/4HANA, Oracle to Fusion, or any legacy system to a modern platform, the core challenge is the same: thousands of users with complex permission structures that need to be mapped to new roles — while maintaining segregation of duties compliance."

**Click Sign In.**

> "We support multiple platforms. For today's demo, we're using a SAP S/4HANA migration scenario with 1,000 users."

**Log in as `admin` / `AdminPass@2026!`.**

---

## Dashboard (2 min)

> "The dashboard gives you a real-time view of where you are in the migration. Right now we have 1,000 source users loaded with their existing roles and permissions, plus 18 target S/4HANA roles and 82 SOD rules already configured."

**Point out:**
- KPI cards (users, source roles, target roles, SOD rules)
- Department mapping status grid
- Strapline status message at top

> "The data was uploaded via CSV — users, source roles, permissions, and SOD rules. In a real engagement, this comes from your SAP security extraction. Let me show you the source data."

**Click Source Roles in sidebar.**

---

## Source Data (1 min)

> "Here are the 21 source roles from SAP ECC. You can expand any role to see its transaction codes and permissions."

**Expand one role (e.g., SAP_GL_ACCOUNTANT) to show permissions.**

> "Each role has detailed permission mappings that our AI will analyze."

**Click Target Roles in sidebar.**

> "And here are the 18 S/4HANA target roles we're mapping to — Fiori apps, new permission structures."

---

## AI Persona Generation (3–4 min)

**Click Personas in sidebar.**

> "This is where the AI takes over. Instead of manually analyzing 1,000 users one by one, Provisum clusters users into security personas based on their actual permission patterns."

**Click "Generate Personas" button.**

> "The AI is now analyzing all 1,000 users — looking at their source roles, permissions, department, and job function to identify natural groupings. This takes about 2–3 minutes."

**While it processes, talk about the approach:**

> "What makes this different from a spreadsheet-based approach is that the AI identifies patterns humans miss. A Financial Controller and an AP Senior Specialist might both touch invoice transactions, but the AI recognizes they have fundamentally different access patterns and creates distinct personas for each."

**When complete, show the results:**
- Persona list with business function filter
- Click the function filter → show "Finance (X)" to filter
- Expand a persona to show description, user count, permissions

> "Each persona has a clear name, business function, and the AI's reasoning for why these users were grouped together."

---

## Auto-Map to Target Roles (2–3 min)

**Navigate to Role Mapping in sidebar.**

> "Now we map these personas to target S/4HANA roles. The AI does this automatically using least-privilege principles."

**Click the Auto-Map button (teal Sparkles button) if available, or navigate to Jobs and run target role mapping.**

> "The AI evaluates each persona against all 18 target roles and selects the minimum set of roles that covers the persona's required permissions — least access by design."

**When complete, show:**
- Persona Mapping tab with mapped roles
- Coverage percentages
- Click a persona to see its target role assignments

> "You can see coverage and excess percentages. The AI aims for high coverage with minimal excess permissions — that's the least-access principle in action."

---

## SOD Analysis (2 min)

**Navigate to SOD Analysis in sidebar (or run SOD analysis from Jobs).**

> "Every mapping is automatically checked against our 82 SOD rules before it can be approved. This isn't a separate step — it's built into the workflow."

**If conflicts exist, show:**
- Conflict list with severity badges (critical/high/medium)
- Expand a conflict to show the risk explanation
- Show the two conflicting permissions and which roles contain them

> "Each conflict comes with a detailed risk explanation and recommended resolution. Critical conflicts cannot be accepted — they must be resolved by changing the mapping. High and medium conflicts can go through a risk acceptance workflow with business justification."

**If no conflicts:** > "Zero SOD conflicts — that means our least-access mapping is clean. In a real migration with more complex role structures, you'd typically see 5-15% of users with conflicts that need resolution."

---

## Approval Workflow (1–2 min)

**Navigate to Approvals in sidebar.**

> "Clean mappings automatically advance to the approval queue. Approvers are scoped to their department — a Finance approver only sees Finance assignments."

**Show the approval queue. If assignments are ready:**
- Click Approve on one
- Show the status change

> "Every approval is audit-logged with the approver's identity, timestamp, and any justification. There's a complete chain of custody from AI recommendation to human approval."

---

## Exports (1 min)

**Navigate to Exports in sidebar.**

> "Once approved, you export in whatever format your target system needs."

**Show the export options:**
- Excel workbook (full project report)
- PDF audit report
- Provisioning CSV (for system loading)
- SailPoint / SAP GRC / ServiceNow formats

> "The Excel report is your audit artifact. The provisioning CSV goes directly into your target system. And the GRC exports feed into your compliance tooling."

---

## Role-Based Access (1 min)

> "Everything in Provisum is role-based. Let me show you how different users see different things."

**Log out. Log in as `mapper.finance` / `Provisum@2026!`.**

> "As a Finance mapper, I only see Finance department users and personas. I can't see Maintenance or Procurement data."

**Show the scoped dashboard, then navigate to Users to show filtered list.**

**Log out. Log in as `viewer` / `Provisum@2026!`.**

> "A viewer has read-only access across the project — useful for auditors and compliance officers who need visibility without modification rights."

---

## Multi-Platform Support (30 sec)

**Log out. On the login page, show the Demo Environment dropdown.**

> "We support multiple migration scenarios out of the box — SAP, Oracle, Workday, Salesforce, ServiceNow. Each environment comes with realistic demo data for that platform's permission model."

**Don't switch — just show the dropdown to save time.**

---

## Closing (30 sec)

> "To summarize: Provisum takes a 1,000-user role migration from months of spreadsheet work to minutes of AI-assisted analysis — with SOD compliance built in, structured approvals, full audit trail, and export-ready reports. Questions?"

---

## Timing Guide

| Section | Duration | Cumulative |
|---------|----------|------------|
| Opening + Login | 1 min | 1 min |
| Dashboard + Source Data | 3 min | 4 min |
| Persona Generation | 3–4 min | 7–8 min |
| Auto-Map | 2–3 min | 10–11 min |
| SOD Analysis | 2 min | 12–13 min |
| Approvals | 1–2 min | 14–15 min |
| Exports | 1 min | 15–16 min |
| Role-Based Access | 1 min | 16–17 min |
| Multi-Platform + Close | 1 min | 17–18 min |

---

## If Something Goes Wrong

| Problem | Recovery |
|---------|----------|
| Persona generation slow | "AI is processing 1,000 users — in production this runs as a background job. Let me show you the results on a pre-loaded environment." → Switch to fallback environment. |
| Render cold start (slow first load) | "The demo server is waking up — in production you'd deploy on always-on infrastructure." Wait 15–30 sec. |
| Rate limited on login | Wait 1 minute (global limit is 50/min). Per-account lockout is 5 minutes. |
| No SOD conflicts found | "Zero conflicts is actually a great result — it means our least-access mapping is clean. In real migrations with 10K+ users, you'd see conflicts." |
| API credits exhausted | Switch to fallback environment with pre-loaded data. |
| Page error | Refresh. If persistent, log out and back in. |
