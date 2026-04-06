# Customer Onboarding Checklist

Step-by-step guide for onboarding a new customer onto Provisum.

---

## Pre-Onboarding (Internal)

- [ ] Customer contract signed and subscription tier confirmed
- [ ] Organization created in Provisum (admin creates via `/admin` → Users)
- [ ] Dedicated demo environment provisioned (if needed for pilot)
- [ ] Assign internal account owner

## Day 1 — Account Setup

### 1. Organization Configuration
- [ ] Log in as `system_admin` → Admin Console → Users
- [ ] Create the customer's organization (if not yet done)
- [ ] Set organization name and slug

### 2. Admin User Creation
- [ ] Create the customer's admin user (role: `admin`)
- [ ] Send invite email (or provide credentials directly)
- [ ] Customer admin accepts invite and sets password

### 3. SSO/SAML Configuration (Enterprise only)
- [ ] Customer provides SAML metadata (IdP entity ID, SSO URL, certificate)
- [ ] Admin Console → SSO tab → Add Configuration
- [ ] Test SSO login with a customer user
- [ ] Document the email domain(s) for SSO routing

## Day 2 — Data Preparation

### 4. Source Data Upload
- [ ] Download upload templates from Provisum (Upload page → Template buttons)
- [ ] Customer populates templates with source system data:
  - **Users** — employee ID, name, department, job title
  - **Roles** — role ID, role name, description
  - **Permissions** — permission ID, permission name, role assignments
  - **User-Role Assignments** — which users have which roles
- [ ] Upload each file via the Upload page
- [ ] Verify row counts and data quality in the upload summary

### 5. Organizational Structure
- [ ] Upload or manually configure org units (departments, divisions)
- [ ] Assign admin/mapper/approver users to their org units
- [ ] Verify scoping: mappers should only see users in their org unit

### 6. Release Configuration
- [ ] Create the first release (e.g., "Wave 1 — Finance")
- [ ] Set source and target system types
- [ ] Configure release scope (org units, user population)
- [ ] Set target dates (mapping deadline, review deadline, approval deadline)

## Day 3 — Team Setup

### 7. User Provisioning
- [ ] Create mapper accounts (one per department/function)
- [ ] Create approver accounts (typically senior managers or compliance)
- [ ] Create coordinator account (project lead)
- [ ] Create viewer accounts (stakeholders who need read-only access)
- [ ] All users accept invites and complete first login
- [ ] All users accept Terms of Service

### 8. Role Assignment Verification
- [ ] Each mapper can see their scoped users (not other departments)
- [ ] Approvers can see the approval queue
- [ ] Coordinator can see all departments and send reminders
- [ ] Admin can access the admin console

## Week 1 — First Workflow Run

### 9. AI Pipeline — Persona Generation
- [ ] Admin or mapper runs "Generate Personas" on the release
- [ ] Review generated personas (typically 15-30 per 1000 users)
- [ ] Validate persona names, business functions, and user assignments
- [ ] Use Calibration page to review low-confidence assignments

### 10. Target Role Library
- [ ] Upload or create target roles (from target system security design)
- [ ] Or: Use AI-generated role suggestions from the security design adapter
- [ ] Security architect reviews and approves draft roles → active

### 11. Role Mapping
- [ ] Mappers review their assigned personas
- [ ] Use "AI Suggest" for mapping recommendations
- [ ] Manually adjust mappings as needed
- [ ] Submit completed mappings for review

### 12. SOD Analysis
- [ ] Admin runs SOD analysis on the release
- [ ] Review SOD conflicts on the SOD page
- [ ] Resolve conflicts: accept risk (with mitigating controls), fix mapping, or escalate
- [ ] Compliance officer reviews accepted risks in Compliance Workspace

### 13. Approval Workflow
- [ ] Approvers review submitted mappings
- [ ] Approve, reject, or send back to draft with comments
- [ ] Coordinator monitors progress via dashboard and sends reminders

## Post-Go-Live

### 14. Export & Provisioning
- [ ] Export approved mappings in required format (Excel, PDF, GRC adapter)
- [ ] Generate SOX/ITGC audit evidence package if needed
- [ ] Schedule recurring exports (if applicable)

### 15. Ongoing
- [ ] Set up scheduled exports for compliance reporting
- [ ] Configure webhook subscriptions for integration with ticketing systems
- [ ] Review feature flag settings for gradual feature rollout
- [ ] Customer admin reviews audit log periodically

---

## Support Resources

- **In-app help:** `/help` — 10 role-aware articles with search
- **AI assistant:** Lumen chatbot available on every page
- **Email:** support@provisum.io
- **Demo credentials:** See README.md for demo account list
