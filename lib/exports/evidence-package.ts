/**
 * SOX/ITGC Audit Evidence Package Generator
 *
 * Compiles the full audit trail into a structured Excel workbook:
 * - Section 1: Control Environment Summary
 * - Section 2: User Access Matrix (who has what)
 * - Section 3: Persona Assignment Audit Trail (how access was determined)
 * - Section 4: SOD Conflict Register (what conflicts exist and their resolution)
 * - Section 5: Approval Audit Trail (who approved what, when)
 */

import ExcelJS from "exceljs";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { orgScope } from "@/lib/org-context";

interface EvidencePackageOptions {
  orgId: number;
  releaseId?: number;
  framework: "sox_404" | "soc2_cc6";
  generatedByUsername: string;
}

interface PackageStats {
  userCount: number;
  personaCount: number;
  assignmentCount: number;
  sodConflictCount: number;
}

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A365D" } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
const SECTION_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF000000" } },
    };
  });
  row.height = 24;
}

export async function generateEvidencePackage(
  options: EvidencePackageOptions
): Promise<{ buffer: Buffer; stats: PackageStats }> {
  const { orgId, releaseId, framework, generatedByUsername } = options;

  // ── Pre-fetch all data in parallel ──────────────────
  const [
    allUsers,
    allPersonas,
    allTargetRoles,
    allAssignments,
    allPersonaAssignments,
    allSodConflicts,
    allSodRules,
    allAuditEntries,
    allGroups,
  ] = await Promise.all([
    db.select().from(schema.users).where(orgScope(schema.users.organizationId, orgId)),
    db.select().from(schema.personas).where(orgScope(schema.personas.organizationId, orgId)),
    db.select().from(schema.targetRoles).where(orgScope(schema.targetRoles.organizationId, orgId)),
    db.select().from(schema.userTargetRoleAssignments),
    db.select().from(schema.userPersonaAssignments),
    db.select().from(schema.sodConflicts),
    db.select().from(schema.sodRules).where(orgScope(schema.sodRules.organizationId, orgId)),
    db.select().from(schema.auditLog).where(orgScope(schema.auditLog.organizationId, orgId)),
    db.select().from(schema.consolidatedGroups).where(orgScope(schema.consolidatedGroups.organizationId, orgId)),
  ]);

  // Filter assignments to users in scope
  const userIds = new Set(allUsers.map((u) => u.id));
  const scopedAssignments = allAssignments.filter((a) => userIds.has(a.userId));
  const scopedPersonaAssignments = allPersonaAssignments.filter((a) => userIds.has(a.userId));
  const scopedConflicts = allSodConflicts.filter((c) => userIds.has(c.userId));

  // If release-scoped, further filter
  const finalAssignments = releaseId
    ? scopedAssignments.filter((a) => a.releaseId === releaseId)
    : scopedAssignments;

  // Build lookup maps
  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  const personaMap = new Map(allPersonas.map((p) => [p.id, p]));
  const roleMap = new Map(allTargetRoles.map((r) => [r.id, r]));
  const ruleMap = new Map(allSodRules.map((r) => [r.id, r]));
  const groupMap = new Map(allGroups.map((g) => [g.id, g]));

  const stats: PackageStats = {
    userCount: allUsers.length,
    personaCount: allPersonas.length,
    assignmentCount: finalAssignments.length,
    sodConflictCount: scopedConflicts.length,
  };

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Provisum — Audit Evidence Package";
  workbook.created = new Date();

  const frameworkLabel = framework === "sox_404" ? "SOX 404" : "SOC 2 CC6";

  // ── Cover Sheet (created first so it's the first tab) ──
  const cover = workbook.addWorksheet("Cover Sheet");
  cover.columns = [
    { key: "label", width: 30 },
    { key: "value", width: 50 },
  ];

  // ── Section 1: Control Environment Summary ─────────
  const s1 = workbook.addWorksheet("1. Control Summary");
  s1.columns = [
    { header: "Control Area", key: "area", width: 35 },
    { header: "Control ID", key: "id", width: 18 },
    { header: "Description", key: "desc", width: 55 },
    { header: "Evidence", key: "evidence", width: 45 },
    { header: "Status", key: "status", width: 15 },
  ];
  styleHeaderRow(s1.getRow(1));

  const controls = framework === "sox_404"
    ? [
        { area: "Access Management", id: "ITGC-AM-01", desc: "User access is assigned based on defined security personas aligned to job function", evidence: `${allPersonas.length} personas defined, ${scopedPersonaAssignments.length} user assignments`, status: "Evidenced" },
        { area: "Access Management", id: "ITGC-AM-02", desc: "Role assignments follow least-access principles and are approved before provisioning", evidence: `${finalAssignments.filter((a) => a.status === "approved").length}/${finalAssignments.length} assignments approved`, status: finalAssignments.length > 0 && finalAssignments.every((a) => a.status === "approved") ? "Compliant" : "In Progress" },
        { area: "Access Management", id: "ITGC-AM-03", desc: "AI-generated persona assignments include confidence scoring and human review", evidence: `AI-assigned with confidence scores; see Section 3`, status: "Evidenced" },
        { area: "Segregation of Duties", id: "ITGC-SOD-01", desc: "SOD conflicts are detected automatically against a maintained rulebook", evidence: `${allSodRules.length} rules, ${scopedConflicts.length} conflicts detected`, status: "Evidenced" },
        { area: "Segregation of Duties", id: "ITGC-SOD-02", desc: "SOD conflicts are reviewed and resolved with documented justification", evidence: `${scopedConflicts.filter((c) => c.resolutionStatus !== "open").length}/${scopedConflicts.length} conflicts resolved; see Section 4`, status: scopedConflicts.every((c) => c.resolutionStatus !== "open") ? "Compliant" : "In Progress" },
        { area: "Change Management", id: "ITGC-CM-01", desc: "All access changes are logged in an immutable audit trail", evidence: `${allAuditEntries.length} audit log entries; see Section 5`, status: "Evidenced" },
        { area: "Change Management", id: "ITGC-CM-02", desc: "Role redesigns triggered by SOD findings follow a documented triage workflow", evidence: "Compliance → Security Architect workflow; see SOD Triage documentation", status: "Evidenced" },
      ]
    : [
        { area: "CC6.1 — Logical Access", id: "CC6.1-01", desc: "Logical access to information assets is managed through persona-based role assignment", evidence: `${allPersonas.length} personas, ${finalAssignments.length} role assignments`, status: "Evidenced" },
        { area: "CC6.1 — Logical Access", id: "CC6.1-02", desc: "Access provisioning requires approval prior to granting", evidence: `${finalAssignments.filter((a) => a.status === "approved").length} approved assignments`, status: "Evidenced" },
        { area: "CC6.3 — Role-Based Access", id: "CC6.3-01", desc: "Access is granted based on roles aligned to job function (least privilege)", evidence: `Persona → Target Role mapping with coverage analysis`, status: "Evidenced" },
        { area: "CC6.6 — SOD Controls", id: "CC6.6-01", desc: "Segregation of duties conflicts are identified and managed", evidence: `${scopedConflicts.length} conflicts analyzed, ${scopedConflicts.filter((c) => c.resolutionStatus !== "open").length} resolved`, status: scopedConflicts.every((c) => c.resolutionStatus !== "open") ? "Compliant" : "In Progress" },
      ];

  for (const c of controls) {
    s1.addRow(c);
  }

  // ── Section 2: User Access Matrix ──────────────────
  const s2 = workbook.addWorksheet("2. User Access Matrix");
  s2.columns = [
    { header: "User ID", key: "userId", width: 18 },
    { header: "Display Name", key: "name", width: 25 },
    { header: "Department", key: "dept", width: 20 },
    { header: "Job Title", key: "title", width: 25 },
    { header: "Assigned Persona", key: "persona", width: 25 },
    { header: "Target Role Code", key: "roleCode", width: 22 },
    { header: "Target Role Name", key: "roleName", width: 30 },
    { header: "Assignment Status", key: "status", width: 18 },
    { header: "SOD Conflict Count", key: "sodCount", width: 18 },
  ];
  styleHeaderRow(s2.getRow(1));

  // Build user → persona map
  const userPersonaIdMap = new Map<number, number>();
  for (const pa of scopedPersonaAssignments) {
    if (pa.personaId) userPersonaIdMap.set(pa.userId, pa.personaId);
  }

  // Build user → SOD conflict count
  const userSodCount = new Map<number, number>();
  for (const c of scopedConflicts) {
    userSodCount.set(c.userId, (userSodCount.get(c.userId) ?? 0) + 1);
  }

  for (const a of finalAssignments) {
    const user = userMap.get(a.userId);
    const role = roleMap.get(a.targetRoleId);
    const personaId = userPersonaIdMap.get(a.userId);
    const persona = personaId ? personaMap.get(personaId) : undefined;

    s2.addRow({
      userId: user?.sourceUserId ?? a.userId,
      name: user?.displayName ?? "Unknown",
      dept: user?.department ?? "",
      title: user?.jobTitle ?? "",
      persona: persona?.name ?? "Unassigned",
      roleCode: role?.roleId ?? "",
      roleName: role?.roleName ?? "Unknown",
      status: a.status,
      sodCount: userSodCount.get(a.userId) ?? 0,
    });
  }

  // ── Section 3: Persona Assignment Audit Trail ──────
  const s3 = workbook.addWorksheet("3. Persona Assignments");
  s3.columns = [
    { header: "User ID", key: "userId", width: 18 },
    { header: "Display Name", key: "name", width: 25 },
    { header: "Assigned Persona", key: "persona", width: 25 },
    { header: "Security Group", key: "group", width: 25 },
    { header: "Assignment Method", key: "method", width: 18 },
    { header: "Confidence Score", key: "confidence", width: 16 },
    { header: "AI Reasoning", key: "reasoning", width: 50 },
    { header: "AI Model", key: "model", width: 18 },
  ];
  styleHeaderRow(s3.getRow(1));

  for (const pa of scopedPersonaAssignments) {
    const user = userMap.get(pa.userId);
    const persona = pa.personaId ? personaMap.get(pa.personaId) : undefined;
    const groupId = persona?.consolidatedGroupId;
    const group = groupId ? groupMap.get(groupId) : undefined;

    s3.addRow({
      userId: user?.sourceUserId ?? pa.userId,
      name: user?.displayName ?? "Unknown",
      persona: persona?.name ?? "Unassigned",
      group: group?.name ?? "",
      method: pa.assignmentMethod ?? "manual",
      confidence: pa.confidenceScore ?? "",
      reasoning: pa.aiReasoning ?? "",
      model: pa.aiModel ?? "",
    });
  }

  // ── Section 4: SOD Conflict Register ───────────────
  const s4 = workbook.addWorksheet("4. SOD Conflicts");
  s4.columns = [
    { header: "Conflict ID", key: "id", width: 12 },
    { header: "Type", key: "type", width: 14 },
    { header: "User ID", key: "userId", width: 18 },
    { header: "User Name", key: "userName", width: 25 },
    { header: "Rule Name", key: "rule", width: 30 },
    { header: "Permission A", key: "permA", width: 22 },
    { header: "Permission B", key: "permB", width: 22 },
    { header: "Severity", key: "severity", width: 12 },
    { header: "Resolution Status", key: "resolution", width: 20 },
  ];
  styleHeaderRow(s4.getRow(1));

  for (const c of scopedConflicts) {
    const user = userMap.get(c.userId);
    const rule = c.sodRuleId ? ruleMap.get(c.sodRuleId) : undefined;

    s4.addRow({
      id: c.id,
      type: c.conflictType ?? "between_role",
      userId: user?.sourceUserId ?? c.userId,
      userName: user?.displayName ?? "Unknown",
      rule: rule?.ruleName ?? "Unknown",
      permA: rule?.permissionA ?? "",
      permB: rule?.permissionB ?? "",
      severity: c.severity ?? "medium",
      resolution: c.resolutionStatus ?? "open",
    });
  }

  // Color code severity
  s4.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const severityCell = row.getCell(8);
    const val = String(severityCell.value).toLowerCase();
    if (val === "critical") severityCell.font = { bold: true, color: { argb: "FFDC2626" } };
    else if (val === "high") severityCell.font = { color: { argb: "FFEA580C" } };
  });

  // ── Section 5: Approval Audit Trail ────────────────
  const s5 = workbook.addWorksheet("5. Approval Audit Trail");
  s5.columns = [
    { header: "Timestamp", key: "ts", width: 22 },
    { header: "Action", key: "action", width: 25 },
    { header: "Performed By", key: "user", width: 20 },
    { header: "Entity Type", key: "entity", width: 18 },
    { header: "Entity ID", key: "entityId", width: 12 },
    { header: "Details", key: "details", width: 55 },
  ];
  styleHeaderRow(s5.getRow(1));

  // Filter audit entries relevant to access control
  const accessActions = new Set([
    "approval", "rejection", "assignment_created", "assignment_updated",
    "persona_assigned", "sod_conflict_resolved", "sod_risk_accepted",
    "mapping_created", "mapping_approved", "mapping_rejected",
    "role_assignment_approved", "role_assignment_rejected",
    "submit_for_review", "bulk_approve",
  ]);

  const relevantAudit = allAuditEntries
    .filter((e) => accessActions.has(e.action) || e.action.includes("approv") || e.action.includes("assign") || e.action.includes("sod") || e.action.includes("map") || e.action.includes("persona"))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  for (const entry of relevantAudit.slice(0, 5000)) {
    s5.addRow({
      ts: entry.createdAt,
      action: entry.action,
      user: entry.actorEmail ?? "system",
      entity: entry.entityType ?? "",
      entityId: entry.entityId ?? "",
      details: entry.metadata ?? "",
    });
  }

  // ── Populate Cover Sheet ─────────────────────────────
  const coverData = [
    { label: "Document Title", value: `${frameworkLabel} Audit Evidence Package` },
    { label: "Generated By", value: generatedByUsername },
    { label: "Generation Date", value: new Date().toISOString().slice(0, 19).replace("T", " ") },
    { label: "Framework", value: frameworkLabel },
    { label: "Scope", value: releaseId ? `Release ID: ${releaseId}` : "All releases (organization-wide)" },
    { label: "", value: "" },
    { label: "Population Summary", value: "" },
    { label: "Total Users", value: String(stats.userCount) },
    { label: "Security Personas", value: String(stats.personaCount) },
    { label: "Role Assignments", value: String(stats.assignmentCount) },
    { label: "SOD Conflicts Detected", value: String(stats.sodConflictCount) },
    { label: "SOD Conflicts Resolved", value: String(scopedConflicts.filter((c) => c.resolutionStatus !== "open").length) },
    { label: "", value: "" },
    { label: "Sections", value: "" },
    { label: "1. Control Summary", value: `${controls.length} controls mapped to ${frameworkLabel}` },
    { label: "2. User Access Matrix", value: `${finalAssignments.length} user-role assignments` },
    { label: "3. Persona Assignments", value: `${scopedPersonaAssignments.length} persona assignments with AI reasoning` },
    { label: "4. SOD Conflicts", value: `${scopedConflicts.length} conflicts with resolution status` },
    { label: "5. Approval Audit Trail", value: `${Math.min(relevantAudit.length, 5000)} audit entries` },
    { label: "", value: "" },
    { label: "Tool", value: "Provisum v1.1.0 — provisum.io" },
    { label: "Disclaimer", value: "This evidence package is auto-generated from system data. It should be reviewed by a qualified auditor before submission." },
  ];

  for (const row of coverData) {
    const r = cover.addRow(row);
    if (row.label === "Document Title") {
      r.getCell(1).font = { bold: true, size: 14 };
      r.getCell(2).font = { bold: true, size: 14 };
    } else if (row.label === "Population Summary" || row.label === "Sections") {
      r.getCell(1).font = { bold: true, size: 12 };
      r.getCell(1).fill = SECTION_FILL;
      r.getCell(2).fill = SECTION_FILL;
    } else if (row.label) {
      r.getCell(1).font = { bold: true };
    }
  }

  const buf = await workbook.xlsx.writeBuffer();

  return {
    buffer: Buffer.from(buf),
    stats,
  };
}
