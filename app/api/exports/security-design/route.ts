import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { orgScope } from "@/lib/org-context";
import { auditLog } from "@/lib/audit";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    if (!["admin", "system_admin", "security_architect"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const orgId = getOrgId(user);

    // Pre-fetch data
    const roles = await db.select().from(schema.targetRoles).where(orgScope(schema.targetRoles.organizationId, orgId));
    const appUsers = await db.select({ id: schema.appUsers.id, displayName: schema.appUsers.displayName }).from(schema.appUsers);
    const appUserMap = new Map(appUsers.map((u) => [u.id, u.displayName]));

    const rolePermissions = await db
      .select({
        targetRoleId: schema.targetRolePermissions.targetRoleId,
        permissionId: schema.targetPermissions.permissionId,
        permissionName: schema.targetPermissions.permissionName,
      })
      .from(schema.targetRolePermissions)
      .innerJoin(schema.targetPermissions, eq(schema.targetPermissions.id, schema.targetRolePermissions.targetPermissionId));

    const assignments = await db
      .select({
        targetRoleId: schema.userTargetRoleAssignments.targetRoleId,
        count: sql<number>`count(*)`,
      })
      .from(schema.userTargetRoleAssignments)
      .groupBy(schema.userTargetRoleAssignments.targetRoleId);

    const assignmentCountMap = new Map(assignments.map((a) => [a.targetRoleId, a.count]));

    const conflicts = await db
      .select({
        id: schema.sodConflicts.id,
        conflictType: schema.sodConflicts.conflictType,
        roleIdA: schema.sodConflicts.roleIdA,
        roleIdB: schema.sodConflicts.roleIdB,
        severity: schema.sodConflicts.severity,
        resolutionStatus: schema.sodConflicts.resolutionStatus,
        mitigatingControl: schema.sodConflicts.mitigatingControl,
        ruleName: schema.sodRules.ruleName,
        userId: schema.sodConflicts.userId,
      })
      .from(schema.sodConflicts)
      .innerJoin(schema.sodRules, eq(schema.sodRules.id, schema.sodConflicts.sodRuleId))
      .innerJoin(schema.users, eq(schema.users.id, schema.sodConflicts.userId))
      .where(orgScope(schema.users.organizationId, orgId));

    // Build role name lookup
    const roleNameMap = new Map(roles.map((r) => [r.id, r.roleName]));

    // Build permission lookup by role
    const permsByRole = new Map<number, string[]>();
    for (const rp of rolePermissions) {
      if (!permsByRole.has(rp.targetRoleId)) permsByRole.set(rp.targetRoleId, []);
      permsByRole.get(rp.targetRoleId)!.push(rp.permissionId);
    }

    // --- Generate Excel ---
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Provisum";
    workbook.created = new Date();

    const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D9488" } };
    const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const ALT_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF9F0" } };

    const styleHeader = (sheet: ExcelJS.Worksheet) => {
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = HEADER_FILL;
        cell.font = HEADER_FONT;
      });
    }

    // Sheet 1: Role Catalog
    const roleCatalog = workbook.addWorksheet("Role Catalog");
    roleCatalog.columns = [
      { header: "Role Name", key: "roleName", width: 30 },
      { header: "Role Code", key: "roleId", width: 20 },
      { header: "Status", key: "status", width: 12 },
      { header: "Source", key: "source", width: 14 },
      { header: "Approved By", key: "approvedBy", width: 20 },
      { header: "Approved At", key: "approvedAt", width: 18 },
      { header: "Permission Count", key: "permCount", width: 16 },
      { header: "User Count", key: "userCount", width: 12 },
    ];
    styleHeader(roleCatalog);

    for (let i = 0; i < roles.length; i++) {
      const r = roles[i];
      const row = roleCatalog.addRow({
        roleName: r.roleName,
        roleId: r.roleId,
        status: r.status,
        source: r.source,
        approvedBy: r.approvedBy ? appUserMap.get(r.approvedBy) ?? "" : "",
        approvedAt: r.approvedAt ?? "",
        permCount: permsByRole.get(r.id)?.length ?? 0,
        userCount: assignmentCountMap.get(r.id) ?? 0,
      });
      if (i % 2 === 1) row.eachCell((cell) => { cell.fill = ALT_FILL; });
    }

    // Sheet 2: Permission Matrix (top 50 permissions by frequency)
    const permFreq = new Map<string, number>();
    Array.from(permsByRole.values()).forEach((perms) => {
      for (const p of perms) {
        permFreq.set(p, (permFreq.get(p) ?? 0) + 1);
      }
    });
    const topPerms = Array.from(permFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([p]) => p);

    const permMatrix = workbook.addWorksheet("Permission Matrix");
    permMatrix.columns = [
      { header: "Role", key: "role", width: 30 },
      ...topPerms.map((p) => ({ header: p, key: p, width: 14 })),
    ];
    styleHeader(permMatrix);

    // Add note row
    const noteRow = permMatrix.addRow({ role: `Showing top ${topPerms.length} permissions by assignment frequency` });
    noteRow.font = { italic: true, size: 9, color: { argb: "FF666666" } };

    for (let i = 0; i < roles.length; i++) {
      const r = roles[i];
      const perms = new Set(permsByRole.get(r.id) ?? []);
      const rowData: Record<string, string> = { role: r.roleName };
      for (const p of topPerms) {
        rowData[p] = perms.has(p) ? "\u2713" : "";
      }
      const row = permMatrix.addRow(rowData);
      if (i % 2 === 1) row.eachCell((cell) => { cell.fill = ALT_FILL; });
    }

    // Sheet 3: SOD Summary
    const sodSummary = workbook.addWorksheet("SOD Summary");
    sodSummary.columns = [
      { header: "Conflict Type", key: "type", width: 14 },
      { header: "Role / Users", key: "roleUsers", width: 30 },
      { header: "SOD Rule", key: "rule", width: 25 },
      { header: "Severity", key: "severity", width: 12 },
      { header: "Status", key: "status", width: 16 },
      { header: "Mitigating Control", key: "control", width: 35 },
    ];
    styleHeader(sodSummary);

    for (let i = 0; i < conflicts.length; i++) {
      const c = conflicts[i];
      const row = sodSummary.addRow({
        type: c.conflictType === "within_role" ? "Within Role" : "Between Roles",
        roleUsers: c.conflictType === "within_role"
          ? roleNameMap.get(c.roleIdA!) ?? ""
          : `${roleNameMap.get(c.roleIdA!) ?? "?"} / ${roleNameMap.get(c.roleIdB!) ?? "?"}`,
        rule: c.ruleName,
        severity: c.severity,
        status: c.resolutionStatus,
        control: c.mitigatingControl ?? "",
      });
      if (i % 2 === 1) row.eachCell((cell) => { cell.fill = ALT_FILL; });
    }

    // Audit log
    await auditLog({
      organizationId: orgId,
      entityType: "export",
      action: "security_design_exported",
      actorEmail: user.email ?? user.username,
      metadata: { roleCount: roles.length, conflictCount: conflicts.length },
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Provisum_Security_Design_${date}.xlsx"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
