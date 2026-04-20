# 09 — System Admin Persona

**Account:** `sysadmin` / `Sysadmin@2026!`
**Role:** `system_admin` (level 100) — full system access, admin console, all tabs
**Tester:** _________________  **Date:** _________________
**Time budget:** 45 min

The sysadmin is the superuser. This script focuses on the admin console and everything NOT covered by the admin persona script.

---

## A. Login & admin console tour

### SYS-01: Login
- [ ] Log in as `sysadmin`
- [ ] **Expected:** `/home`; role label "System Admin"; Admin Console tile visible

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SYS-02: Admin console landing
- [ ] Navigate to `/admin`
- [ ] **Expected:** Landing page with tabs or sections: Users, Feature Flags, Webhooks, Scheduled Exports, Email, SSO, Incidents, Security Design, Evidence Package, Migration Health, Validation, Demo Environment

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## B. Users tab

### SYS-03: Users list
- [ ] Navigate to `/admin/users` (or Users tab)
- [ ] **Expected:** All app users listed (the 10 demo accounts + any invited); filter by role, org unit

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SYS-04: Invite user
- [ ] Click Invite User
- [ ] Fill email + role + org unit scope
- [ ] Send invite
- [ ] **Expected:** Invite created; appears in pending invites; email attempt fires (fire-and-forget)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SYS-05: Bulk CSV invite
- [ ] Click Bulk CSV Upload
- [ ] **Expected:** Template download available; upload form

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SYS-06: Deactivate/change role
- [ ] Pick an existing user, try Deactivate or Change Role (careful — don't lock yourself out)
- [ ] **Expected:** Action works; toast confirms

**Result:** ⬜ Pass  ⬜ Fail  ⬜ Skipped (risky)
**Notes:**

---

## C. Feature flags

### SYS-07: Feature flags list
- [ ] Navigate to Feature Flags tab
- [ ] **Expected:** Default 5 flags seeded, each with enabled/disabled, targeting info

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SYS-08: Toggle a flag
- [ ] Toggle one flag off then back on
- [ ] **Expected:** Change persists (60s cache — might take up to 1 min to see effect)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SYS-09: Create a flag with role targeting
- [ ] Create a new flag, target role=mapper, percentage=50%
- [ ] **Expected:** Flag created; targeting persists

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## D. Webhooks

### SYS-10: Webhook list
- [ ] Navigate to Webhooks tab
- [ ] **Expected:** List of configured endpoints with enabled/disabled, failure count

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SYS-11: Add a webhook
- [ ] Add a webhook with a test URL (e.g., https://webhook.site/your-unique-url)
- [ ] Pick event types
- [ ] Save
- [ ] **Expected:** Webhook created; signing secret visible

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SYS-12: Delivery log
- [ ] **Expected:** Can see past delivery attempts, status codes

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## E. Scheduled exports

### SYS-13: Scheduled exports tab
- [ ] Navigate to Scheduled Exports
- [ ] **Expected:** List of schedules with daily/weekly/monthly cadence, next run

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SYS-14: Create a schedule
- [ ] Create a schedule (e.g., weekly provisioning export)
- [ ] **Expected:** Saved; next run calculated

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## F. Email settings

### SYS-15: Email tab
- [ ] Navigate to Email tab
- [ ] **Expected:** Enabled toggle, from address, from name, reply-to, test email button, API key status

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SYS-16: Send test email
- [ ] Click Send Test Email (to your own address)
- [ ] **Expected:** Test email fires (may land in your inbox; skip verifying delivery if time-constrained — just confirm the API returns success)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## G. SSO configuration

### SYS-17: SSO tab
- [ ] Navigate to SSO
- [ ] **Expected:** Add SSO provider form (Azure AD, Okta, Generic SAML)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SYS-18: Configure mock SSO
- [ ] Add a mock provider with test metadata
- [ ] **Expected:** Saved; appears in list; note that actual IdP redirect requires Supabase Enterprise so it's config-only

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## H. Incidents

### SYS-19: Incidents page
- [ ] Navigate to `/admin/incidents`
- [ ] **Expected:** Incident list with severity, status, AI triage data, re-triage button

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SYS-20: Create a test incident
- [ ] Click Create Incident
- [ ] Fill form, submit
- [ ] **Expected:** Incident created; AI triage kicks off in background; after a few seconds, triage card populates with category + suggested fix

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## I. Migration health dashboard

### SYS-21: Migration health
- [ ] Navigate to `/admin/migration-health`
- [ ] **Expected:** 6 KPI cards, pipeline visualization, confidence distribution chart, overall health score

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## J. Validation dashboard

### SYS-22: Validation page
- [ ] Navigate to `/admin/validation`
- [ ] **Expected:** Overview tab with pipeline flow, stat cards, edge case panel

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SYS-23: User attribution chain
- [ ] Click Users tab
- [ ] Click any user row
- [ ] **Expected:** Modal opens with full attribution: source attrs → persona (with AI reasoning + confidence) → target roles → SOD conflicts

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SYS-24: Validation Excel export
- [ ] Click Export
- [ ] **Expected:** 5-tab XLSX downloads (Validation Summary, Full Attribution Chain, Persona Distribution, SOD Conflicts, Methodology)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## K. Evidence package

### SYS-25: Evidence package generator
- [ ] Navigate to `/admin/evidence-package`
- [ ] **Expected:** Generation form + history of past runs
- [ ] Generate a new package
- [ ] **Expected:** Package generates; 6-tab XLSX downloads

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## L. Security design (tested in Security Architect script too)

### SYS-26: Security design access
- [ ] Navigate to `/admin/security-design`
- [ ] **Expected:** Same interface security architect uses; sysadmin has full access

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## M. Demo environment controls

### SYS-27: Demo environment tab
- [ ] Find Demo Environment controls
- [ ] **Expected:** Reset demo, switch demo pack buttons

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SYS-28: Switch demo pack (CAREFUL — destroys data)
- [ ] Before running this, ensure nothing important is in progress
- [ ] Switch to a different demo pack (e.g., Energy & Chemicals → Financial Services or similar)
- [ ] **Expected:** Reseed completes; data reflects new pack

**Result:** ⬜ Pass  ⬜ Fail  ⬜ Skipped
**Notes:**

---

## N. Admin activity pulse

### SYS-29: Activity pulse widget
- [ ] On `/admin` landing, find the Activity Pulse widget
- [ ] **Expected:** Last 24h + 7d action counts, top action types, recent activity feed

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## O. Encryption key rotation (rarely used)

### SYS-30: Rotate keys endpoint exists
- [ ] Find Rotate Keys action (system_admin only)
- [ ] **Expected:** UI present; don't actually rotate unless ENCRYPTION_KEY_PREVIOUS is set

**Result:** ⬜ Pass  ⬜ Fail  ⬜ Skipped (env requirement)
**Notes:**

---

## P. Knowledge Base — full visibility

### SYS-31: All articles visible
- [ ] Navigate to `/help`
- [ ] **Expected:** All 28 articles across all 7 categories visible (sysadmin sees admin-only articles too)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## Issues Found

| # | Step ID | Severity | One-line description |
|---|---------|----------|----------------------|
|   |         |          |                      |
|   |         |          |                      |
|   |         |          |                      |
|   |         |          |                      |

**Overall sysadmin persona result:** ⬜ All green  ⬜ Some failures  ⬜ Blocker hit
