import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type UploadType =
  | "users"
  | "source-roles"
  | "target-roles"
  | "role-assignments"
  | "role-permissions"
  | "target-permissions"
  | "sod-rules"
  | "personas"
  | "app-users"
  | "existing-access"
  | "org-units"
  | "releases"
  | "release-scope";

type TemplateConfig = {
  headers: string[];
  picklistColumns: Record<string, string[] | (() => Promise<string[]>)>;
  examples: Record<string, string>[];
};

async function resolvePicklists(
  picklistColumns: Record<string, string[] | (() => Promise<string[]>)>
): Promise<Record<string, string[]>> {
  const resolved: Record<string, string[]> = {};
  for (const [col, valuesOrFn] of Object.entries(picklistColumns)) {
    if (Array.isArray(valuesOrFn)) {
      resolved[col] = valuesOrFn;
    } else {
      try {
        resolved[col] = await valuesOrFn();
      } catch {
        resolved[col] = [];
      }
    }
  }
  return resolved;
}

function getTemplateConfig(type: UploadType): TemplateConfig | null {
  // Dynamic fetchers
  const fetchOrgUnitNames = async () => {
    const rows = await db.select({ name: schema.orgUnits.name }).from(schema.orgUnits);
    return rows.map((r) => r.name);
  };

  const fetchUserIds = async () => {
    const rows = await db.select({ id: schema.users.sourceUserId }).from(schema.users).limit(50);
    return rows.map((r) => r.id);
  };

  const fetchSourceRoleIds = async () => {
    const rows = await db.select({ id: schema.sourceRoles.roleId }).from(schema.sourceRoles).limit(50);
    return rows.map((r) => r.id);
  };

  const fetchParentOrgUnits = async () => {
    const rows = await db.select({ name: schema.orgUnits.name, level: schema.orgUnits.level }).from(schema.orgUnits);
    return rows.filter((r) => r.level === "L1" || r.level === "L2").map((r) => r.name);
  };

  const fetchReleaseNames = async () => {
    const rows = await db.select({ name: schema.releases.name }).from(schema.releases);
    return rows.map((r) => r.name);
  };

  const fetchTargetRoleIds = async () => {
    const rows = await db.select({ id: schema.targetRoles.roleId }).from(schema.targetRoles).limit(50);
    return rows.map((r) => r.id);
  };

  switch (type) {
    case "users":
      return {
        headers: ["source_user_id", "display_name", "email", "department", "job_title", "org_unit", "cost_center"],
        picklistColumns: {
          department: fetchOrgUnitNames,
          org_unit: fetchOrgUnitNames,
        },
        examples: [
          { source_user_id: "USR001", display_name: "John Smith", email: "john.smith@company.com", department: "Finance", job_title: "AP Manager", org_unit: "Finance", cost_center: "CC1001" },
          { source_user_id: "USR002", display_name: "Maria Garcia", email: "maria.garcia@company.com", department: "Procurement", job_title: "Buyer", org_unit: "Procurement", cost_center: "CC2001" },
        ],
      };

    case "source-roles":
      return {
        headers: ["role_id", "role_name", "description", "system", "domain", "role_type", "role_owner"],
        picklistColumns: {
          role_type: ["business", "technical", "composite"],
        },
        examples: [
          { role_id: "SAP-FI-001", role_name: "AP Clerk", description: "Accounts payable processing", system: "SAP ECC", domain: "Finance", role_type: "business", role_owner: "Finance Team" },
          { role_id: "SAP-MM-001", role_name: "Buyer", description: "Procurement purchasing", system: "SAP ECC", domain: "Procurement", role_type: "business", role_owner: "Procurement Team" },
        ],
      };

    case "target-roles":
      return {
        headers: ["role_id", "role_name", "description", "system", "domain", "role_owner"],
        picklistColumns: {
          role_type: ["single", "composite", "master"],
        },
        examples: [
          { role_id: "S4-FI-001", role_name: "AP Specialist", description: "S/4HANA accounts payable", system: "S/4HANA", domain: "Finance", role_owner: "Finance Team" },
          { role_id: "S4-MM-001", role_name: "Procurement Specialist", description: "S/4HANA procurement", system: "S/4HANA", domain: "Procurement", role_owner: "Procurement Team" },
        ],
      };

    case "role-assignments":
      return {
        headers: ["user_id", "role_id", "assigned_date"],
        picklistColumns: {
          user_id: fetchUserIds,
          role_id: fetchSourceRoleIds,
        },
        examples: [
          { user_id: "USR001", role_id: "SAP-FI-001", assigned_date: "2024-01-15" },
          { user_id: "USR002", role_id: "SAP-MM-001", assigned_date: "2024-03-01" },
        ],
      };

    case "role-permissions":
      return {
        headers: ["role_id", "permission_id", "permission_name", "system"],
        picklistColumns: {
          role_id: fetchSourceRoleIds,
        },
        examples: [
          { role_id: "SAP-FI-001", permission_id: "FK01", permission_name: "Create Vendor", system: "SAP ECC" },
          { role_id: "SAP-FI-001", permission_id: "F110", permission_name: "Payment Run", system: "SAP ECC" },
        ],
      };

    case "target-permissions":
      return {
        headers: ["permission_id", "permission_name", "description", "system", "permission_type", "risk_level"],
        picklistColumns: {
          risk_level: ["critical", "high", "medium", "low"],
          permission_type: ["transaction", "authorization_object", "fiori_app"],
        },
        examples: [
          { permission_id: "S4-AP-001", permission_name: "Manage Suppliers", description: "Create and modify supplier records", system: "S/4HANA", permission_type: "fiori_app", risk_level: "high" },
          { permission_id: "S4-AP-002", permission_name: "Process Payments", description: "Execute payment runs", system: "S/4HANA", permission_type: "fiori_app", risk_level: "critical" },
        ],
      };

    case "sod-rules":
      return {
        headers: ["rule_id", "rule_name", "permission_a", "permission_b", "severity", "risk_description"],
        picklistColumns: {
          severity: ["critical", "high", "medium", "low"],
          conflict_type: ["cross_role", "within_role"],
        },
        examples: [
          { rule_id: "SOD-AP-001", rule_name: "Vendor Create vs Payment", permission_a: "FK01", permission_b: "F110", severity: "critical", risk_description: "Can create fictitious vendors and pay them" },
          { rule_id: "SOD-MM-001", rule_name: "Create PO vs Goods Receipt", permission_a: "ME21N", permission_b: "MIGO_GR", severity: "critical", risk_description: "Can fabricate procurement transactions" },
        ],
      };

    case "personas":
      return {
        headers: ["name", "description", "business_function"],
        picklistColumns: {},
        examples: [
          { name: "AP Processor", description: "Handles invoice processing and vendor payments", business_function: "Finance" },
          { name: "Procurement Buyer", description: "Manages purchase orders and vendor selection", business_function: "Procurement" },
        ],
      };

    case "app-users":
      return {
        headers: ["username", "password", "display_name", "role", "email", "org_unit_name"],
        picklistColumns: {
          role: ["system_admin", "admin", "coordinator", "mapper", "approver", "viewer"],
          org_unit_name: fetchOrgUnitNames,
        },
        examples: [
          { username: "mapper.finance", password: "SecurePass@2026!", display_name: "Finance Mapper", role: "mapper", email: "mapper@company.com", org_unit_name: "Finance" },
          { username: "approver.ops", password: "SecurePass@2026!", display_name: "Ops Approver", role: "approver", email: "approver@company.com", org_unit_name: "Operations" },
        ],
      };

    case "existing-access":
      return {
        headers: ["source_user_id", "target_role_id"],
        picklistColumns: {
          source_user_id: fetchUserIds,
          target_role_id: fetchTargetRoleIds,
        },
        examples: [
          { source_user_id: "USR001", target_role_id: "S4-FI-001" },
          { source_user_id: "USR002", target_role_id: "S4-MM-001" },
        ],
      };

    case "org-units":
      return {
        headers: ["name", "level", "parent_name", "description"],
        picklistColumns: {
          level: ["L1", "L2", "L3"],
          parent_name: fetchParentOrgUnits,
        },
        examples: [
          { name: "Finance", level: "L1", parent_name: "", description: "Finance division" },
          { name: "Accounts Payable", level: "L2", parent_name: "Finance", description: "AP department" },
        ],
      };

    case "releases":
      return {
        headers: ["name", "description", "status", "release_type", "target_system", "target_date", "is_active"],
        picklistColumns: {
          status: ["planning", "active", "completed", "paused"],
          release_type: ["initial", "remediation", "enhancement"],
        },
        examples: [
          { name: "Wave 1 - Finance", description: "Finance module go-live", status: "planning", release_type: "initial", target_system: "S/4HANA", target_date: "2026-06-01", is_active: "true" },
        ],
      };

    case "release-scope":
      return {
        headers: ["release_name", "org_unit_name"],
        picklistColumns: {
          release_name: fetchReleaseNames,
          org_unit_name: fetchOrgUnitNames,
        },
        examples: [
          { release_name: "Wave 1 - Finance", org_unit_name: "Finance" },
          { release_name: "Wave 1 - Finance", org_unit_name: "Accounts Payable" },
        ],
      };

    default:
      return null;
  }
}

function escapeCsvValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsvString(
  headers: string[],
  resolvedPicklists: Record<string, string[]>,
  examples: Record<string, string>[]
): string {
  const lines: string[] = [];

  // Header row
  lines.push(headers.map(escapeCsvValue).join(","));

  // Comment row with valid values for picklist columns
  const hasPicklists = Object.keys(resolvedPicklists).some(
    (col) => headers.includes(col) && resolvedPicklists[col].length > 0
  );
  if (hasPicklists) {
    const commentValues = headers.map((h) => {
      const values = resolvedPicklists[h];
      if (values && values.length > 0) {
        const display = values.length <= 20
          ? values.join(" | ")
          : values.slice(0, 20).join(" | ") + ` | ... (${values.length} total)`;
        return `# Valid: ${display}`;
      }
      return "";
    });
    lines.push(commentValues.map(escapeCsvValue).join(","));
  }

  // Example rows
  for (const example of examples) {
    const row = headers.map((h) => escapeCsvValue(example[h] || ""));
    lines.push(row.join(","));
  }

  return lines.join("\n") + "\n";
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as UploadType | null;

  if (!type) {
    return NextResponse.json({ error: "Missing 'type' query parameter" }, { status: 400 });
  }

  const config = getTemplateConfig(type);
  if (!config) {
    return NextResponse.json({ error: `Unknown upload type: ${type}` }, { status: 400 });
  }

  const resolvedPicklists = await resolvePicklists(config.picklistColumns);
  const csv = buildCsvString(config.headers, resolvedPicklists, config.examples);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="template-${type}.csv"`,
    },
  });
}
