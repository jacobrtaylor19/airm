import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const HEADER_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
// Color fills for conditional formatting (available for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TEAL_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D9488" } };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const RED_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEF4444" } };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AMBER_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF59E0B" } };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const GREEN_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF22C55E" } };

function applyHeaderRow(sheet: ExcelJS.Worksheet, headers: string[]) {
  const row = sheet.addRow(headers);
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle" };
  });
  sheet.autoFilter = { from: { row: row.number, column: 1 }, to: { row: row.number, column: headers.length } };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Provisum Validation Engine";
  workbook.created = new Date();

  // ─────────────────────────────────────────────
  // Pre-fetch all data
  // ─────────────────────────────────────────────
  const allUsers = await db.select().from(schema.users);
  const allPersonas = await db.select().from(schema.personas);
  const allTargetRoles = await db.select().from(schema.targetRoles);

  const personaAssignments = await db
    .select({
      userId: schema.userPersonaAssignments.userId,
      personaId: schema.userPersonaAssignments.personaId,
      personaName: schema.personas.name,
      businessFunction: schema.personas.businessFunction,
      confidenceScore: schema.userPersonaAssignments.confidenceScore,
      aiReasoning: schema.userPersonaAssignments.aiReasoning,
      assignmentMethod: schema.userPersonaAssignments.assignmentMethod,
      groupName: schema.consolidatedGroups.name,
    })
    .from(schema.userPersonaAssignments)
    .leftJoin(schema.personas, eq(schema.userPersonaAssignments.personaId, schema.personas.id))
    .leftJoin(schema.consolidatedGroups, eq(schema.userPersonaAssignments.consolidatedGroupId, schema.consolidatedGroups.id));

  const paMap: Record<number, (typeof personaAssignments)[0]> = {};
  for (const pa of personaAssignments) {
    paMap[pa.userId] = pa;
  }

  const roleAssignments = await db
    .select({
      userId: schema.userTargetRoleAssignments.userId,
      targetRoleId: schema.userTargetRoleAssignments.targetRoleId,
      targetRoleName: schema.targetRoles.roleName,
      domain: schema.targetRoles.domain,
      status: schema.userTargetRoleAssignments.status,
      assignmentType: schema.userTargetRoleAssignments.assignmentType,
      derivedFromPersonaId: schema.userTargetRoleAssignments.derivedFromPersonaId,
      sodConflictCount: schema.userTargetRoleAssignments.sodConflictCount,
    })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.targetRoles, eq(schema.userTargetRoleAssignments.targetRoleId, schema.targetRoles.id));

  const rolesByUser: Record<number, typeof roleAssignments> = {};
  for (const ra of roleAssignments) {
    if (!rolesByUser[ra.userId]) rolesByUser[ra.userId] = [];
    rolesByUser[ra.userId].push(ra);
  }

  const sourceRoleCounts = await db
    .select({
      userId: schema.userSourceRoleAssignments.userId,
      roleCount: count(),
    })
    .from(schema.userSourceRoleAssignments)
    .groupBy(schema.userSourceRoleAssignments.userId);

  const srcMap: Record<number, number> = {};
  for (const s of sourceRoleCounts) {
    srcMap[s.userId] = s.roleCount;
  }

  const sodConflicts = await db
    .select({
      userId: schema.sodConflicts.userId,
      ruleId: schema.sodRules.ruleId,
      severity: schema.sodConflicts.severity,
      permA: schema.sodConflicts.permissionIdA,
      permB: schema.sodConflicts.permissionIdB,
      resolutionStatus: schema.sodConflicts.resolutionStatus,
      roleNameA: schema.targetRoles.roleName,
    })
    .from(schema.sodConflicts)
    .innerJoin(schema.sodRules, eq(schema.sodConflicts.sodRuleId, schema.sodRules.id))
    .leftJoin(schema.targetRoles, eq(schema.sodConflicts.roleIdA, schema.targetRoles.id));

  // ─────────────────────────────────────────────
  // TAB 1: Validation Summary
  // ─────────────────────────────────────────────
  const summarySheet = workbook.addWorksheet("Validation Summary");
  summarySheet.getColumn("A").width = 40;
  summarySheet.getColumn("B").width = 25;

  summarySheet.addRow([]);
  const logoRow = summarySheet.addRow(["PROVISUM — PIPELINE VALIDATION REPORT"]);
  logoRow.font = { bold: true, size: 18, color: { argb: "FF1E293B" } };
  const sub = summarySheet.addRow(["Due Diligence & Accuracy Validation"]);
  sub.font = { size: 12, italic: true, color: { argb: "FF64748B" } };
  summarySheet.addRow([]);
  summarySheet.addRow(["Generated", new Date().toLocaleString()]);
  summarySheet.addRow(["Generated By", user.username]);
  summarySheet.addRow([]);

  const usersWithPersonaCount = personaAssignments.filter((p) => p.personaId).length;
  const usersWithRoles = Object.keys(rolesByUser).length;
  const pipelineCoverage = allUsers.length > 0 ? Math.round((usersWithPersonaCount / allUsers.length) * 100) : 0;

  const sTitle = summarySheet.addRow(["Pipeline Coverage Metrics"]);
  sTitle.font = { bold: true, size: 14 };
  summarySheet.addRow([]);
  applyHeaderRow(summarySheet, ["Metric", "Value"]);
  summarySheet.addRow(["Total Source Users", allUsers.length]);
  summarySheet.addRow(["Users Assigned a Persona", usersWithPersonaCount]);
  summarySheet.addRow(["Users with Target Roles", usersWithRoles]);
  summarySheet.addRow(["Pipeline Coverage (Persona)", `${pipelineCoverage}%`]);
  summarySheet.addRow(["Total Personas Generated", allPersonas.length]);
  summarySheet.addRow(["Total Target Roles Available", allTargetRoles.length]);
  summarySheet.addRow(["Total Role Assignments", roleAssignments.length]);
  summarySheet.addRow(["Total SOD Conflicts", sodConflicts.length]);
  summarySheet.addRow([]);

  const eTitle = summarySheet.addRow(["Edge Case Analysis"]);
  eTitle.font = { bold: true, size: 14 };
  summarySheet.addRow([]);
  applyHeaderRow(summarySheet, ["Edge Case", "Count", "% of Users"]);
  const edgeCases = [
    ["No Persona Assigned", allUsers.length - usersWithPersonaCount],
    ["Persona but No Target Roles", personaAssignments.filter((p) => p.personaId && !rolesByUser[p.userId]).length],
    ["Low Confidence (<60)", personaAssignments.filter((p) => p.confidenceScore !== null && p.confidenceScore! < 60).length],
    ["High SOD Conflicts (3+)", new Set(sodConflicts.filter((s) => {
      const userConflicts = sodConflicts.filter((c) => c.userId === s.userId);
      return userConflicts.length >= 3;
    }).map((s) => s.userId)).size],
    ["10+ Source Roles (complex user)", allUsers.filter((u) => (srcMap[u.id] ?? 0) >= 10).length],
    ["8+ Target Roles assigned", allUsers.filter((u) => (rolesByUser[u.id] ?? []).length >= 8).length],
  ];
  for (const [label, cnt] of edgeCases) {
    const pct = allUsers.length > 0 ? ((cnt as number) / allUsers.length * 100).toFixed(1) : "0";
    summarySheet.addRow([label, cnt, `${pct}%`]);
  }

  // ─────────────────────────────────────────────
  // TAB 2: Full Attribution Chain
  // ─────────────────────────────────────────────
  const chainSheet = workbook.addWorksheet("Full Attribution Chain");
  applyHeaderRow(chainSheet, [
    "Source User ID", "Display Name", "Department", "Job Title", "Org Unit",
    "Source Role Count",
    "Persona", "Business Function", "Security Group",
    "Confidence (%)", "AI Reasoning",
    "Target Roles Assigned", "Target Role Names", "Target Role Domains",
    "Assignment Status(es)", "SOD Conflict Count",
    "Validation Flags",
  ]);

  for (const u of allUsers) {
    const pa = paMap[u.id];
    const roles = rolesByUser[u.id] ?? [];
    const flags: string[] = [];

    if (!pa?.personaId) flags.push("NO_PERSONA");
    if (pa?.personaId && roles.length === 0) flags.push("PERSONA_NO_ROLES");
    if (pa?.confidenceScore !== null && pa?.confidenceScore !== undefined && pa.confidenceScore < 60) flags.push("LOW_CONFIDENCE");
    if ((srcMap[u.id] ?? 0) >= 10) flags.push("COMPLEX_USER");
    if (roles.length >= 8) flags.push("MANY_ROLES");
    const userSod = sodConflicts.filter((s) => s.userId === u.id);
    if (userSod.length >= 3) flags.push("HIGH_SOD");

    const row = chainSheet.addRow([
      u.sourceUserId,
      u.displayName,
      u.department ?? "",
      u.jobTitle ?? "",
      u.orgUnit ?? "",
      srcMap[u.id] ?? 0,
      pa?.personaName ?? "—",
      pa?.businessFunction ?? "—",
      pa?.groupName ?? "—",
      pa?.confidenceScore ?? null,
      pa?.aiReasoning ?? "—",
      roles.length,
      roles.map((r) => r.targetRoleName).join("; "),
      roles.map((r) => r.domain ?? "").join("; "),
      Array.from(new Set(roles.map((r) => r.status))).join("; "),
      userSod.length,
      flags.join(", ") || "CLEAN",
    ]);

    // Color-code the flags column
    const flagCell = row.getCell(17);
    if (flags.length > 0) {
      flagCell.font = { bold: true, color: { argb: "FFDC2626" } };
    } else {
      flagCell.font = { color: { argb: "FF16A34A" } };
    }
  }

  // Auto-width
  chainSheet.columns.forEach((col) => { col.width = Math.max(col.width ?? 12, 14); });
  chainSheet.getColumn(11).width = 60; // AI reasoning
  chainSheet.getColumn(13).width = 40; // Target role names
  chainSheet.getColumn(14).width = 30; // Domains

  // ─────────────────────────────────────────────
  // TAB 3: Persona Distribution
  // ─────────────────────────────────────────────
  const distSheet = workbook.addWorksheet("Persona Distribution");
  applyHeaderRow(distSheet, [
    "Persona", "Business Function", "User Count", "% of Total",
    "Avg Confidence", "Min Confidence", "Max Confidence",
    "Target Roles Mapped",
  ]);

  const personaRoleMappings = await db
    .select({
      personaId: schema.personaTargetRoleMappings.personaId,
      roleCount: count(),
    })
    .from(schema.personaTargetRoleMappings)
    .groupBy(schema.personaTargetRoleMappings.personaId);

  const prmMap: Record<number, number> = {};
  for (const p of personaRoleMappings) { prmMap[p.personaId] = p.roleCount; }

  // Group persona assignments by personaId
  const personaCounts: Record<number, { name: string; fn: string; count: number; scores: number[] }> = {};
  for (const pa of personaAssignments) {
    if (!pa.personaId) continue;
    if (!personaCounts[pa.personaId]) {
      personaCounts[pa.personaId] = { name: pa.personaName ?? "", fn: pa.businessFunction ?? "", count: 0, scores: [] };
    }
    personaCounts[pa.personaId].count++;
    if (pa.confidenceScore !== null && pa.confidenceScore !== undefined) {
      personaCounts[pa.personaId].scores.push(pa.confidenceScore);
    }
  }

  const sortedPersonas = Object.entries(personaCounts).sort((a, b) => b[1].count - a[1].count);
  for (const [pid, data] of sortedPersonas) {
    const pct = allUsers.length > 0 ? ((data.count / allUsers.length) * 100).toFixed(1) : "0";
    const avg = data.scores.length > 0 ? (data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(1) : "—";
    const min = data.scores.length > 0 ? Math.min(...data.scores).toFixed(1) : "—";
    const max = data.scores.length > 0 ? Math.max(...data.scores).toFixed(1) : "—";
    distSheet.addRow([
      data.name, data.fn, data.count, `${pct}%`,
      avg, min, max,
      prmMap[parseInt(pid)] ?? 0,
    ]);
  }

  distSheet.columns.forEach((col) => { col.width = Math.max(col.width ?? 12, 16); });

  // ─────────────────────────────────────────────
  // TAB 4: SOD Conflict Detail
  // ─────────────────────────────────────────────
  const sodSheet = workbook.addWorksheet("SOD Conflicts");
  applyHeaderRow(sodSheet, [
    "User ID", "Display Name", "SOD Rule", "Severity",
    "Permission A", "Permission B", "Role A",
    "Resolution Status",
  ]);

  const userMap: Record<number, string> = {};
  for (const u of allUsers) { userMap[u.id] = u.displayName; }

  for (const c of sodConflicts) {
    const row = sodSheet.addRow([
      c.userId,
      userMap[c.userId] ?? "Unknown",
      c.ruleId,
      c.severity,
      c.permA,
      c.permB,
      c.roleNameA ?? "—",
      c.resolutionStatus,
    ]);

    // Color severity
    const sevCell = row.getCell(4);
    if (c.severity === "critical") sevCell.font = { bold: true, color: { argb: "FFDC2626" } };
    else if (c.severity === "high") sevCell.font = { color: { argb: "FFEA580C" } };
  }

  sodSheet.columns.forEach((col) => { col.width = Math.max(col.width ?? 12, 16); });

  // ─────────────────────────────────────────────
  // TAB 5: Methodology
  // ─────────────────────────────────────────────
  const methSheet = workbook.addWorksheet("Methodology");
  methSheet.getColumn("A").width = 25;
  methSheet.getColumn("B").width = 80;

  methSheet.addRow([]);
  const mTitle = methSheet.addRow(["Validation Methodology"]);
  mTitle.font = { bold: true, size: 16 };
  methSheet.addRow([]);

  const methodRows = [
    ["Purpose", "This report provides a complete, traceable record of the AI-assisted role mapping pipeline. Each user's journey from source system attributes through persona classification to target role assignment is documented with confidence scores and reasoning."],
    ["Pipeline", "Source User Attributes → AI Persona Classification → Persona-to-Role Mapping → User Target Role Assignment → SOD Analysis"],
    ["Confidence Score", "Each persona assignment includes a confidence score (0-100) reflecting the strength of the match between the user's source permissions/attributes and the persona's characteristic permission profile."],
    ["Assignment Method", "Personas are assigned via AI analysis of the user's source roles, permissions, department, and job function. The AI evaluates overlap between the user's permission set and each persona's defining permissions."],
    ["SOD Analysis", "Segregation of Duties analysis checks all assigned target roles for conflicting permissions. Conflicts are flagged by severity (critical/high/medium/low) and require explicit resolution."],
    ["Validation Flags", "Users flagged for review include: NO_PERSONA (unclassified), LOW_CONFIDENCE (<60%), PERSONA_NO_ROLES (missing role derivation), COMPLEX_USER (10+ source roles), MANY_ROLES (8+ target roles), HIGH_SOD (3+ conflicts)."],
    ["Audit Trail", "All pipeline actions are logged in an immutable, append-only audit database with actor, timestamp, and before/after state."],
    ["How to Validate", "1. Review the Full Attribution Chain tab for completeness. 2. Spot-check flagged users for correctness. 3. Verify persona distribution is reasonable. 4. Confirm SOD conflicts are appropriately handled."],
  ];

  for (const [label, desc] of methodRows) {
    const r = methSheet.addRow([label, desc]);
    r.getCell(1).font = { bold: true };
    r.getCell(2).alignment = { wrapText: true };
  }

  // ─────────────────────────────────────────────
  // Generate buffer
  // ─────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="provisum-validation-report-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
