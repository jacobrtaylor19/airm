import ExcelJS from "exceljs";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function generateExcelReport(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Provisum";
  workbook.created = new Date();

  // Sheet 1: User-Persona Mapping
  const sheet1 = workbook.addWorksheet("User-Persona Mapping");
  sheet1.columns = [
    { header: "User ID", key: "sourceUserId", width: 15 },
    { header: "Name", key: "displayName", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Department", key: "department", width: 20 },
    { header: "Job Title", key: "jobTitle", width: 25 },
    { header: "Persona", key: "personaName", width: 25 },
    { header: "Confidence", key: "confidence", width: 12 },
    { header: "Group", key: "groupName", width: 25 },
  ];

  const users = db.select().from(schema.users).all();
  for (const user of users) {
    const assignment = db.select({
      personaName: schema.personas.name,
      confidence: schema.userPersonaAssignments.confidenceScore,
      groupName: schema.consolidatedGroups.name,
    })
      .from(schema.userPersonaAssignments)
      .leftJoin(schema.personas, eq(schema.personas.id, schema.userPersonaAssignments.personaId))
      .leftJoin(schema.consolidatedGroups, eq(schema.consolidatedGroups.id, schema.personas.consolidatedGroupId))
      .where(eq(schema.userPersonaAssignments.userId, user.id))
      .get();

    sheet1.addRow({
      sourceUserId: user.sourceUserId,
      displayName: user.displayName,
      email: user.email,
      department: user.department,
      jobTitle: user.jobTitle,
      personaName: assignment?.personaName ?? "Unassigned",
      confidence: assignment?.confidence ?? null,
      groupName: assignment?.groupName ?? "",
    });
  }
  styleHeader(sheet1);

  // Sheet 2: Persona-Target Role Mapping
  const sheet2 = workbook.addWorksheet("Persona-Role Mapping");
  sheet2.columns = [
    { header: "Persona", key: "personaName", width: 25 },
    { header: "Business Function", key: "businessFunction", width: 20 },
    { header: "Target Role ID", key: "targetRoleId", width: 15 },
    { header: "Target Role Name", key: "targetRoleName", width: 25 },
    { header: "Coverage %", key: "coveragePercent", width: 12 },
    { header: "Confidence", key: "confidence", width: 12 },
    { header: "Reason", key: "reason", width: 40 },
  ];

  const mappings = db.select({
    personaName: schema.personas.name,
    businessFunction: schema.personas.businessFunction,
    targetRoleId: schema.targetRoles.roleId,
    targetRoleName: schema.targetRoles.roleName,
    coveragePercent: schema.personaTargetRoleMappings.coveragePercent,
    confidence: schema.personaTargetRoleMappings.confidence,
    reason: schema.personaTargetRoleMappings.mappingReason,
  })
    .from(schema.personaTargetRoleMappings)
    .innerJoin(schema.personas, eq(schema.personas.id, schema.personaTargetRoleMappings.personaId))
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.personaTargetRoleMappings.targetRoleId))
    .all();

  for (const m of mappings) {
    sheet2.addRow(m);
  }
  styleHeader(sheet2);

  // Sheet 3: Full Mapping Chain
  const sheet3 = workbook.addWorksheet("Full Mapping Chain");
  sheet3.columns = [
    { header: "User ID", key: "sourceUserId", width: 15 },
    { header: "User Name", key: "displayName", width: 25 },
    { header: "Department", key: "department", width: 20 },
    { header: "Persona", key: "personaName", width: 25 },
    { header: "Target Role", key: "targetRoleName", width: 25 },
    { header: "Assignment Type", key: "assignmentType", width: 18 },
    { header: "Status", key: "status", width: 18 },
  ];

  const fullChain = db.select({
    sourceUserId: schema.users.sourceUserId,
    displayName: schema.users.displayName,
    department: schema.users.department,
    personaName: schema.personas.name,
    targetRoleName: schema.targetRoles.roleName,
    assignmentType: schema.userTargetRoleAssignments.assignmentType,
    status: schema.userTargetRoleAssignments.status,
  })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.userTargetRoleAssignments.targetRoleId))
    .leftJoin(schema.personas, eq(schema.personas.id, schema.userTargetRoleAssignments.derivedFromPersonaId))
    .all();

  for (const row of fullChain) {
    sheet3.addRow(row);
  }
  styleHeader(sheet3);

  // Sheet 4: SOD Conflicts
  const sheet4 = workbook.addWorksheet("SOD Conflicts");
  sheet4.columns = [
    { header: "User", key: "userName", width: 25 },
    { header: "Severity", key: "severity", width: 12 },
    { header: "Rule", key: "ruleName", width: 25 },
    { header: "Permission A", key: "permissionIdA", width: 15 },
    { header: "Permission B", key: "permissionIdB", width: 15 },
    { header: "Resolution", key: "resolutionStatus", width: 15 },
    { header: "Notes", key: "resolutionNotes", width: 40 },
  ];

  const conflicts = db.select({
    userName: schema.users.displayName,
    severity: schema.sodConflicts.severity,
    ruleName: schema.sodRules.ruleName,
    permissionIdA: schema.sodConflicts.permissionIdA,
    permissionIdB: schema.sodConflicts.permissionIdB,
    resolutionStatus: schema.sodConflicts.resolutionStatus,
    resolutionNotes: schema.sodConflicts.resolutionNotes,
  })
    .from(schema.sodConflicts)
    .innerJoin(schema.users, eq(schema.users.id, schema.sodConflicts.userId))
    .innerJoin(schema.sodRules, eq(schema.sodRules.id, schema.sodConflicts.sodRuleId))
    .all();

  for (const c of conflicts) {
    sheet4.addRow(c);
  }
  styleHeader(sheet4);

  // Sheet 5: Permission Gaps
  const sheet5 = workbook.addWorksheet("Permission Gaps");
  sheet5.columns = [
    { header: "Persona", key: "personaName", width: 25 },
    { header: "Permission ID", key: "permissionId", width: 15 },
    { header: "Permission Name", key: "permissionName", width: 25 },
    { header: "Gap Type", key: "gapType", width: 15 },
    { header: "Notes", key: "notes", width: 40 },
  ];

  const gapRows = db.select({
    personaName: schema.personas.name,
    permissionId: schema.sourcePermissions.permissionId,
    permissionName: schema.sourcePermissions.permissionName,
    gapType: schema.permissionGaps.gapType,
    notes: schema.permissionGaps.notes,
  })
    .from(schema.permissionGaps)
    .innerJoin(schema.personas, eq(schema.personas.id, schema.permissionGaps.personaId))
    .innerJoin(schema.sourcePermissions, eq(schema.sourcePermissions.id, schema.permissionGaps.sourcePermissionId))
    .all();

  for (const g of gapRows) {
    sheet5.addRow(g);
  }
  styleHeader(sheet5);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };
}
