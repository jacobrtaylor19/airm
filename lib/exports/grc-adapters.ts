import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

// ─────────────────────────────────────────────
// GRC Export Adapter Interface
// ─────────────────────────────────────────────

export interface GrcExportAdapter {
  name: string;
  format: string; // "csv" | "xlsx" | "xml"
  generate(): Promise<Buffer>;
}

// ─────────────────────────────────────────────
// Shared: fetch approved assignments
// ─────────────────────────────────────────────

function getApprovedAssignments() {
  return db
    .select({
      sourceUserId: schema.users.sourceUserId,
      displayName: schema.users.displayName,
      department: schema.users.department,
      targetRoleId: schema.targetRoles.roleId,
      targetRoleName: schema.targetRoles.roleName,
      targetSystem: schema.targetRoles.system,
      approvedAt: schema.userTargetRoleAssignments.approvedAt,
    })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .innerJoin(
      schema.targetRoles,
      eq(schema.targetRoles.id, schema.userTargetRoleAssignments.targetRoleId)
    )
    .where(eq(schema.userTargetRoleAssignments.status, "approved"))
    .all();
}

function csvEscape(val: string | null | undefined): string {
  const s = val ?? "";
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ─────────────────────────────────────────────
// SAP GRC Adapter
// ─────────────────────────────────────────────

export const sapGrcAdapter: GrcExportAdapter = {
  name: "SAP GRC",
  format: "csv",
  async generate(): Promise<Buffer> {
    const assignments = getApprovedAssignments();
    const today = new Date().toISOString().split("T")[0];
    const validTo = "9999-12-31";

    const header = "Username,RoleID,RoleName,ValidFrom,ValidTo,Action,SystemID";
    const rows = assignments.map(
      (a) =>
        `${csvEscape(a.sourceUserId)},${csvEscape(a.targetRoleId)},${csvEscape(a.targetRoleName)},${today},${validTo},ASSIGN,${csvEscape(a.targetSystem)}`
    );

    return Buffer.from([header, ...rows].join("\n"), "utf-8");
  },
};

// ─────────────────────────────────────────────
// ServiceNow Adapter
// ─────────────────────────────────────────────

export const serviceNowAdapter: GrcExportAdapter = {
  name: "ServiceNow",
  format: "csv",
  async generate(): Promise<Buffer> {
    const assignments = getApprovedAssignments();

    const header = "user_name,role,assignment_group,state,sys_domain";
    const rows = assignments.map(
      (a) =>
        `${csvEscape(a.sourceUserId)},${csvEscape(a.targetRoleName)},${csvEscape(a.department)},active,global`
    );

    return Buffer.from([header, ...rows].join("\n"), "utf-8");
  },
};

// ─────────────────────────────────────────────
// SailPoint Adapter
// ─────────────────────────────────────────────

export const sailPointAdapter: GrcExportAdapter = {
  name: "SailPoint",
  format: "csv",
  async generate(): Promise<Buffer> {
    const assignments = getApprovedAssignments();

    const header = "identityName,applicationName,entitlementName,operation,source";
    const rows = assignments.map(
      (a) =>
        `${csvEscape(a.displayName)},${csvEscape(a.targetSystem)},${csvEscape(a.targetRoleName)},Add,Provisum`
    );

    return Buffer.from([header, ...rows].join("\n"), "utf-8");
  },
};
