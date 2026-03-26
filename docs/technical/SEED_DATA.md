# Seed Data — Demo Environments

Provisum ships with 9 pre-built demo environments covering different ERP migration scenarios. Each environment includes realistic users, roles, permissions, and SOD rules. Personas and target role assignments are NOT pre-seeded — they are generated live via the AI pipeline during demos.

## Usage

```bash
# Default pack (SAP ECC → S/4HANA, 1K users)
pnpm db:seed

# Specific demo pack
pnpm db:seed -- --demo=oracle-fusion
pnpm db:seed -- --demo=workday
```

All CSVs live in `data/demos/{packname}/`.

---

## Environment Summary

| Pack | Source System | Target System | Users | Source Roles | Source Perms | Target Roles | Target Perms | SOD Rules | Files |
|------|-------------|--------------|-------|-------------|-------------|-------------|-------------|-----------|-------|
| `default` | SAP ECC | S/4HANA | 1,000 | 20 | 110 | 18 | 33 | 94* | 10 |
| `energy-chemicals-s4hana` | SAP ECC | S/4HANA | 100 | 20 | 70 | 18 | 40 | 51* | 10 |
| `consumer-products-s4hana` | SAP ECC | S/4HANA | 100 | 20 | 46 | 18 | 32 | 41* | 10 |
| `financial-services-s4hana` | SAP ECC | S/4HANA | 100 | 20 | 110 | 18 | 66 | 81* | 10 |
| `manufacturing-s4hana` | SAP ECC | S/4HANA | 100 | 20 | 109 | 18 | 63 | 60 | 10 |
| `oracle-fusion` | Oracle EBS | Oracle Fusion | 100 | 20 | 45 | 18 | 30 | 25 | 10 |
| `workday` | Legacy HRIS | Workday HCM | 100 | 20 | 40 | 18 | 35 | 22 | 10 |
| `salesforce` | Legacy CRM | Salesforce | 100 | 20 | 40 | 18 | 33 | 20 | 10 |
| `servicenow` | ServiceNow ITSM | ServiceNow | 100 | 20 | 115 | 18 | 64 | 60 | 10 |

\* SAP packs marked with `*` include 21 additional hardcoded S/4HANA Fiori-specific SOD rules (covering AP, GL, MM, PM cross-domain conflicts). These are only inserted when the pack contains S/4HANA target permission IDs (F0717, etc.).

---

## CSV File Types

### Core (10 files, all packs)

| File | Description | Key Columns |
|------|-------------|-------------|
| `users.csv` | Source system users | `source_user_id`, `display_name`, `email`, `job_title`, `department` |
| `source-roles.csv` | Source system roles | `role_id`, `role_name`, `description`, `system`, `domain` |
| `source-permissions.csv` | Source system permissions | `permission_id`, `permission_name`, `description`, `system`, `risk_level` |
| `source-role-permissions.csv` | Role → permission mapping | `role_id`, `permission_id` |
| `target-roles.csv` | Target system roles | `role_id`, `role_name`, `description`, `system`, `domain` |
| `target-permissions.csv` | Target system permissions | `permission_id`, `permission_name`, `description`, `system`, `risk_level` |
| `target-role-permissions.csv` | Target role → permission mapping | `target_role_id`, `permission_id` |
| `sod-rules.csv` | Segregation of duties rules | `rule_id`, `rule_name`, `permission_a`, `permission_b`, `severity`, `risk_description` |
| `user-source-role-assignments.csv` | User → source role assignments | `user_id`, `role_id` |
| `user-target-role-assignments.csv` | User → target role assignments | `user_id`, `role_id` |

### Persona (4 additional files, default pack only)

| File | Description | Key Columns |
|------|-------------|-------------|
| `personas.csv` | Pre-generated AI personas | `name`, `description`, `business_function` |
| `consolidated-groups.csv` | Security consolidation groups | `name`, `access_level`, `description` |
| `persona-group-mappings.csv` | Persona → group assignments | `persona_name`, `consolidated_group_name` |
| `user-persona-assignments.csv` | User → persona assignments | `source_user_id`, `persona_name`, `confidence_score`, `assignment_method` |

---

## Permission Naming Conventions

| System | Format | Examples |
|--------|--------|---------|
| SAP ECC (source) | T-code prefix | `XK01`, `FB60`, `ME21N` |
| S/4HANA (target) | Fiori app IDs | `F0717`, `F0859`, `F2439` |
| Oracle EBS (source) | `EBS_` + module prefix | `EBS_AP_CLERK`, `EBS_PO_MANAGER` |
| Oracle Fusion (target) | `OFC_` + function | `OFC_AP_INV_PROC`, `OFC_AP_INV_APPR` |
| Legacy HRIS (source) | `HRIS_` + function | `HRIS_HR_ADMIN`, `HRIS_PAYROLL` |
| Workday (target) | `WD_` + module + function | `WD_HR_VIEW_WORKER`, `WD_HR_EDIT_WORKER` |
| Legacy CRM (source) | `CRM_` + function | `CRM_SALES_REP`, `CRM_ADMIN` |
| Salesforce (target) | `SF_` + object + action | `SF_ACCT_VIEW`, `SF_OPP_CREATE` |
| ServiceNow (source/target) | `SN_` + module | `SN_INC_CREATE`, `SN_CHG_APPROVE` |

---

## Regenerating Data

The Python generator script is at the project root:
```bash
python3 generate_demo_data.py
```

This regenerates all CSVs. Do not regenerate unless schema or business logic changes — the current files are validated and tested.

---

## Seed Behavior Notes

- **Default pack** (`pnpm db:seed` with no flag) loads from `data/demos/default/`
- **Persona files** are gracefully skipped for non-default packs (generate via the AI pipeline in-app)
- **10K packs** use progress indicators during user insertion
- **SAP SOD rules** (21 hardcoded Fiori permission rules) only inserted when the pack contains S/4HANA target permissions
- **Org hierarchy** is the same for all packs (31 org units across 3 levels)
- **App users** are always created: 11 internal test users + 5 self-guided demo accounts
- **Database is fully cleared** before each seed — tables are deleted in reverse dependency order
- **No pre-generated personas or mappings** — all packs seed source data only; personas and mappings generated live via AI pipeline

## App User Accounts

### Internal Accounts
| Username | Password | Role |
|----------|----------|------|
| sysadmin | Sysadmin@2026! | system_admin |
| admin | AdminPass@2026! | admin |
| mapper.finance | Provisum@2026! | mapper |
| mapper.maintenance | Provisum@2026! | mapper |
| mapper.procurement | Provisum@2026! | mapper |
| approver.finance | Provisum@2026! | approver |
| approver.operations | Provisum@2026! | approver |
| viewer | Provisum@2026! | viewer |
| security.lead | Security@2026! | mapper |
| compliance.officer | Compliance@2026! | approver |
| grc.analyst | GrcAnalyst@2026! | viewer |

### Self-Guided Demo Accounts
| Username | Password | Role | Scope |
|----------|----------|------|-------|
| demo.admin | DemoGuide2026! | admin | Full access |
| demo.mapper.finance | DemoGuide2026! | mapper | Finance dept |
| demo.approver | DemoGuide2026! | approver | All depts |
| demo.viewer | DemoGuide2026! | viewer | Read-only |
| demo.coordinator | DemoGuide2026! | coordinator | All depts |
