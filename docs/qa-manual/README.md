# Provisum v1.5.0 — Manual QA Kit

**For:** Jacob (primary tester). **Time budget:** ~5.5 hours for full pass. Do it in chunks.

This kit is designed so you can execute each script without thinking, mark pass/fail inline, and paste the filled file back to me for triage.

---

## How to use this kit

1. **Start at demo.provisum.io** — all scripts target the demo environment unless noted
2. **Reset demo data** before starting a full pass — sysadmin → Admin console → Demo Environment → "Reset Demo Data"
3. **Execute scripts in order**. `00-smoke-test.md` first, then pick a persona script
4. **Fill in checkboxes** (`⬜` → `✅` for pass, `❌` for fail) as you go
5. **Write notes** in the Notes field for anything unexpected (even if it passed)
6. **Log issues** in the table at the bottom of each script
7. **Hand back** the filled script(s) — just paste them into the chat, I'll triage and fix

---

## Test environment

- **URL:** https://demo.provisum.io
- **Reset:** sysadmin → Admin console → "Reset Demo Data" (takes ~60s)
- **Demo pack:** Financial Services (1,000 users, 21 source roles, 18 target roles, ~2,130 assignments, ~1,170 SOD conflicts)

## Test accounts

| Username | Password | Role | Scope |
|----------|----------|------|-------|
| `demo.admin` | `DemoGuide2026!` | admin | All |
| `demo.mapper.finance` | `DemoGuide2026!` | mapper | Finance org unit |
| `demo.mapper.operations` | `DemoGuide2026!` | mapper | Operations org unit |
| `demo.approver` | `DemoGuide2026!` | approver | All |
| `demo.viewer` | `DemoGuide2026!` | viewer | All (read-only) |
| `demo.coordinator` | `DemoGuide2026!` | coordinator | Assigned org unit |
| `demo.pm` | `DemoGuide2026!` | project_manager | All |
| `demo.compliance` | `DemoGuide2026!` | compliance_officer | All |
| `demo.security` | `DemoGuide2026!` | security_architect | All |
| `sysadmin` | `Sysadmin@2026!` | system_admin | Full system |

> **Tip:** The login page has quick-login pills for the demo accounts. Click once; password auto-fills. Just hit Sign In.

---

## Script order

| # | Script | Persona | Time | When |
|---|--------|---------|------|------|
| 00 | `00-smoke-test.md` | All | 15 min | Always run first |
| 01 | `01-admin.md` | admin | 45 min | Core |
| 02 | `02-mapper.md` | mapper (×2) | 45 min | Core |
| 03 | `03-approver.md` | approver | 30 min | Core |
| 04 | `04-viewer.md` | viewer | 15 min | Core |
| 05 | `05-coordinator.md` | coordinator | 30 min | Core |
| 06 | `06-project-manager.md` | project_manager | 20 min | Extended |
| 07 | `07-compliance-officer.md` | compliance_officer | 30 min | Extended |
| 08 | `08-security-architect.md` | security_architect | 30 min | Extended |
| 09 | `09-sysadmin.md` | system_admin | 45 min | Extended (admin console) |
| 10 | `10-cross-persona-workflows.md` | Multiple | 45 min | Integration — run last |

Minimum viable test: 00–05 (~2 hours). Full QA: 00–10 (~5.5 hours).

---

## Severity rubric

When logging issues at the bottom of each script, use these severity levels. This controls how I triage:

| Severity | Meaning | Example |
|----------|---------|---------|
| **Blocker** | App unusable for this persona; cannot proceed with core workflow | Login fails; dashboard returns 500; can't submit for approval |
| **High** | Feature broken or returns wrong data; workflow can continue but output is unreliable | SOD count wrong; export missing data; approval button disabled when it shouldn't be |
| **Medium** | UI/UX problem that makes the feature annoying but not broken | Button in wrong spot; confusing label; slow load on heavy page |
| **Low** | Cosmetic or minor inconsistency | Typo; misaligned element; inconsistent spacing |
| **Question** | Not sure if it's a bug — want my take | "Should the approver see X here?" |

---

## Feedback format (for hand-back)

Each script has two types of feedback surfaces:

### 1. Inline per-step result
```
**Result:** ⬜ Pass  ⬜ Fail
**Notes:** <anything unexpected, even if it passed>
```

Change `⬜` to `✅` for pass, `❌` for fail. Leave Notes blank if nothing to say.

### 2. Issue log at bottom of each script
```
## Issues Found

| # | Step ID | Severity | One-line description |
|---|---------|----------|----------------------|
| 1 | ADMIN-04 | High | Dashboard KPI count is 0 but should be ~20 |
| 2 | ADMIN-12 | Low | Typo: "Persona" misspelled in sidebar |
```

Just add rows as you go. Use the Step ID from the script so I can jump straight to the broken thing.

---

## What's in scope

**App only** (demo.provisum.io). Sales site (provisum.io) is out of scope here.

**In scope:**
- All 9 personas
- All 5 workflow stages (Upload → Personas → Mapping → SOD → Approvals)
- All 9 modules (see `/home` tile launcher)
- Dashboard + strapline
- Knowledge Base (`/help`)
- Notifications
- Lumen AI assistant
- Exports (Excel, PPTX, SOX evidence package)
- Admin console (all tabs)
- Gap analysis workbench
- Risk Analysis
- Calibration
- Target role lifecycle (draft/active/archived)
- Compliance + Security workspaces
- Support ticket form

**Out of scope:**
- Sales site
- Provisioning API endpoints (tested separately)
- Real email delivery (Resend) — verify UI only, don't chase email receipts
- Supabase admin UI
- Vercel deployment console

---

## Quick reference — things that commonly confuse testers

1. **Two "admin" accounts:** `demo.admin` (role=admin) and `sysadmin` (role=system_admin). Sysadmin has extra powers (feature flags, webhooks, SSO, etc.).
2. **Mapper scoping:** `demo.mapper.finance` only sees Finance org unit users. `demo.mapper.operations` only sees Operations.
3. **Within-role SOD:** By default, mappers don't see within-role conflicts. Only compliance_officer, security_architect, admin, and approver do.
4. **Remapping tab:** Only appears when there are `remap_required` assignments. If empty, it won't show.
5. **Demo pack switching:** Some scripts reference Financial Services demo pack. If you're on a different pack, some counts will differ.
6. **Welcome tour:** First login shows a tour. Click "Skip Tour" to get past it. After that, it won't reappear.
7. **Release selector:** Top of sidebar. Scope of everything you see depends on which release is active.
