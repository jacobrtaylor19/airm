/**
 * System context for AI pipeline prompts.
 * Provides structured terminology and permission model info per source/target system.
 */

export interface SystemTypeInfo {
  value: string;
  label: string;
  permissionUnit: string;
  roleUnit: string;
  identifierPattern: string;
  promptContext: string;
}

// ── Source Systems ─────────────────────────────────────────────────

export const SOURCE_SYSTEM_TYPES: SystemTypeInfo[] = [
  {
    value: "SAP_ECC",
    label: "SAP ECC 6.0",
    permissionUnit: "Authorization object + T-code",
    roleUnit: "Single role / Composite role",
    identifierPattern: "T-codes: alphanumeric 4-20 chars (e.g., ME21N, FB60)",
    promptContext: `Source System: SAP ECC 6.0
Permission model: Authorization objects and T-codes (transaction codes)
Examples: ME21N (Create Purchase Order), FB60 (Enter Vendor Invoice), MM60 (Inventory Turnover)
Persona naming: Use SAP functional area terminology (MM, FI, SD, HR, PP, etc.)`,
  },
  {
    value: "SAP_S4HANA",
    label: "SAP S/4HANA",
    permissionUnit: "Fiori app + authorization object",
    roleUnit: "Single role / Composite role",
    identifierPattern: "App IDs: F-prefixed or semantic names",
    promptContext: `Source System: SAP S/4HANA
Permission model: Fiori apps with semantic actions and authorization objects
Role structure: Composite roles containing single roles
Naming convention: SAP standard (e.g., SAP_MM_PURCH_MGR)`,
  },
  {
    value: "SAP_BW",
    label: "SAP BW/4HANA",
    permissionUnit: "Analysis authorization + InfoProvider",
    roleUnit: "Analysis role",
    identifierPattern: "InfoObject-based authorizations",
    promptContext: `Source System: SAP BW/4HANA
Permission model: Analysis authorizations on InfoProviders
Primarily analytics/reporting roles, not transactional`,
  },
  {
    value: "ORACLE_EBS",
    label: "Oracle E-Business Suite",
    permissionUnit: "Function / Menu path",
    roleUnit: "Responsibility",
    identifierPattern: "Responsibility names in UPPER_SNAKE",
    promptContext: `Source System: Oracle E-Business Suite
Permission model: Responsibilities with menu paths and functions
Identifiers: Responsibility names (UPPER_SNAKE_CASE format)
Structure: Responsibility → Menu → Function hierarchy`,
  },
  {
    value: "ORACLE_CLOUD",
    label: "Oracle Cloud (Fusion)",
    permissionUnit: "Duty role / Privilege",
    roleUnit: "Job role",
    identifierPattern: "Pattern: ORA_* prefix",
    promptContext: `Source System: Oracle Cloud (Fusion)
Permission model: Job roles containing duty roles and privileges
Identifiers: ORA_ prefixed role codes
Structure: Job Role → Duty Role → Privilege hierarchy`,
  },
  {
    value: "WORKDAY",
    label: "Workday",
    permissionUnit: "Domain / Subdomain",
    roleUnit: "Security group",
    identifierPattern: "Functional area prefixes",
    promptContext: `Source System: Workday
Permission model: Security groups with domain-level access policies
Structure: Security Group → Domain → Subdomain permissions
Identifiers: Functional area-based naming`,
  },
  {
    value: "DYNAMICS_365",
    label: "Microsoft Dynamics 365",
    permissionUnit: "Privilege / Duty",
    roleUnit: "Security role",
    identifierPattern: "PascalCase names",
    promptContext: `Source System: Microsoft Dynamics 365
Permission model: Security roles with duties and privileges
Identifiers: PascalCase role and privilege names
Structure: Security Role → Duty → Privilege`,
  },
  {
    value: "DYNAMICS_AX",
    label: "Microsoft Dynamics AX",
    permissionUnit: "Privilege / Duty",
    roleUnit: "Security role",
    identifierPattern: "PascalCase names (legacy)",
    promptContext: `Source System: Microsoft Dynamics AX (legacy, pre-365)
Permission model: Same structure as Dynamics 365 but older naming conventions`,
  },
  {
    value: "SERVICENOW",
    label: "ServiceNow",
    permissionUnit: "Role / Group membership",
    roleUnit: "Role",
    identifierPattern: "snake_case role names",
    promptContext: `Source System: ServiceNow
Permission model: Roles and group memberships
Identifiers: snake_case role identifiers`,
  },
  {
    value: "OTHER",
    label: "Other / Custom",
    permissionUnit: "Permission",
    roleUnit: "Role",
    identifierPattern: "Varies",
    promptContext: `Source System: Custom/Legacy system
Permission model: Generic role-based access control`,
  },
];

// ── Target Systems ────────────────────────────────────────────────

export const TARGET_SYSTEM_TYPES: SystemTypeInfo[] = [
  {
    value: "SAP_S4HANA",
    label: "SAP S/4HANA",
    permissionUnit: "Fiori app + authorization object",
    roleUnit: "Single role / Composite role",
    identifierPattern: "SAP standard naming (e.g., SAP_MM_PURCH_MGR)",
    promptContext: `Target System: SAP S/4HANA
Permission model: Fiori apps with semantic actions and authorization objects
Role structure: Composite roles containing single roles
Naming convention: SAP standard naming (e.g., SAP_MM_PURCH_MGR)`,
  },
  {
    value: "SAP_RISE",
    label: "SAP RISE (S/4HANA Cloud)",
    permissionUnit: "Fiori app + authorization object",
    roleUnit: "Business role / Business catalog",
    identifierPattern: "SAP standard + cloud role naming",
    promptContext: `Target System: SAP RISE (S/4HANA Private Cloud Edition)
Permission model: Business roles and business catalogs
Similar to S/4HANA on-premise but with cloud-specific role delivery`,
  },
  {
    value: "ORACLE_CLOUD",
    label: "Oracle Cloud (Fusion)",
    permissionUnit: "Duty role / Privilege",
    roleUnit: "Job role",
    identifierPattern: "ORA_* prefix",
    promptContext: `Target System: Oracle Cloud (Fusion)
Permission model: Job roles containing duty roles and privileges
Identifiers: ORA_ prefixed role codes`,
  },
  {
    value: "WORKDAY",
    label: "Workday",
    permissionUnit: "Domain / Subdomain",
    roleUnit: "Security group",
    identifierPattern: "Functional area prefixes",
    promptContext: `Target System: Workday
Permission model: Security groups with domain-level access policies`,
  },
  {
    value: "DYNAMICS_365",
    label: "Microsoft Dynamics 365",
    permissionUnit: "Privilege / Duty",
    roleUnit: "Security role",
    identifierPattern: "PascalCase names",
    promptContext: `Target System: Microsoft Dynamics 365
Permission model: Security roles with duties and privileges`,
  },
  {
    value: "SERVICENOW",
    label: "ServiceNow",
    permissionUnit: "Role / Group membership",
    roleUnit: "Role",
    identifierPattern: "snake_case role names",
    promptContext: `Target System: ServiceNow
Permission model: Roles and group memberships`,
  },
  {
    value: "OTHER",
    label: "Other / Custom",
    permissionUnit: "Permission",
    roleUnit: "Role",
    identifierPattern: "Varies",
    promptContext: `Target System: Custom/target system
Permission model: Generic role-based access control`,
  },
];

// ── Helpers ───────────────────────────────────────────────────────

export function getSourceSystemInfo(value: string): SystemTypeInfo {
  return SOURCE_SYSTEM_TYPES.find((s) => s.value === value) ?? SOURCE_SYSTEM_TYPES[SOURCE_SYSTEM_TYPES.length - 1];
}

export function getTargetSystemInfo(value: string): SystemTypeInfo {
  return TARGET_SYSTEM_TYPES.find((s) => s.value === value) ?? TARGET_SYSTEM_TYPES[TARGET_SYSTEM_TYPES.length - 1];
}

export function getSourceSystemLabel(value: string): string {
  return getSourceSystemInfo(value).label;
}

export function getTargetSystemLabel(value: string): string {
  return getTargetSystemInfo(value).label;
}

/**
 * Build the system context block for AI pipeline prompts.
 */
export function buildSystemContextPrompt(sourceType: string, targetType: string): string {
  const source = getSourceSystemInfo(sourceType);
  const target = getTargetSystemInfo(targetType);
  return `## System Context

${source.promptContext}

${target.promptContext}

Use this system context to inform your analysis. Permission identifiers, role naming conventions, and organizational patterns should be interpreted through the lens of these specific systems.`;
}
