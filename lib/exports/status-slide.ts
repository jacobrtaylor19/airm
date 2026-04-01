import PptxGenJS from "pptxgenjs";
import { getDashboardStats, getDepartmentMappingStatus } from "@/lib/queries";
import { getAggregateRiskAnalysis } from "@/lib/queries";
import { getUserScope, getUserScopeDepartments } from "@/lib/scope";
import { getOrgId } from "@/lib/org-context";
import type { AppUser } from "@/lib/auth";

// Brand colors (6-digit hex only — pptxgenjs doesn't support alpha hex)
const TEAL = "0D9488";
const TEAL_DARK = "0F766E";
const TEAL_LIGHT = "B2DFDB";
const CREAM_WARM = "F5F0EA";
const TEXT = "1A1A1A";
const TEXT_MUTED = "6B6560";
const TEXT_LIGHT = "9A928A";
const WHITE = "FFFFFF";
const GREEN = "059669";
const GREEN_LIGHT = "D1FAE5";
const RED = "DC2626";
const RED_LIGHT = "FEE2E2";
const AMBER = "D97706";
const AMBER_LIGHT = "FEF3C7";
const LIGHT_GRAY = "C0C0C0";
const E8E2DA = "E8E2DA"; // brand border

export async function generateStatusSlide(user: AppUser): Promise<Buffer> {
  const orgId = getOrgId(user);
  const scopedUserIds = await getUserScope(user);
  const scopeDepts = await getUserScopeDepartments(user);

  const [stats, deptStatus, riskAnalysis] = await Promise.all([
    getDashboardStats(orgId),
    getDepartmentMappingStatus(orgId),
    getAggregateRiskAnalysis(orgId, scopedUserIds),
  ]);

  const isScoped = scopeDepts && scopeDepts.length > 0;
  const scopeLabel = isScoped ? scopeDepts.join(", ") : "All Departments";

  const mappedPercent = stats.totalPersonas > 0
    ? Math.round((stats.personasWithMapping / stats.totalPersonas) * 100) : 0;
  const approvedPercent = stats.totalAssignments > 0
    ? Math.round((stats.approvedAssignments / stats.totalAssignments) * 100) : 0;
  const personaCoverage = stats.totalUsers > 0
    ? Math.round((stats.usersWithPersona / stats.totalUsers) * 100) : 0;

  const depts = isScoped
    ? deptStatus.filter(d => scopeDepts!.includes(d.department))
    : deptStatus;

  const totalConflicts = stats.sodConflictsBySeverity.reduce((sum, s) => sum + s.count, 0);
  const criticalConflicts = stats.sodConflictsBySeverity.find(s => s.severity === "critical")?.count ?? 0;
  const highConflicts = stats.sodConflictsBySeverity.find(s => s.severity === "high")?.count ?? 0;

  // Compute overall health score (0-100)
  const healthFactors = [
    personaCoverage,                                                    // persona coverage
    mappedPercent,                                                       // mapping progress
    approvedPercent,                                                     // approval progress
    Math.max(0, 100 - Math.min(100, Math.round(totalConflicts / 5))),   // SOD (fewer = better)
    riskAnalysis.businessContinuity.avgCoverage,                         // continuity
  ];
  const healthScore = Math.round(healthFactors.reduce((a, b) => a + b, 0) / healthFactors.length);
  const healthLabel = healthScore >= 70 ? "On Track" : healthScore >= 40 ? "Needs Attention" : "At Risk";

  // Determine blockers for PM
  const blockers: string[] = [];
  if (mappedPercent === 0 && personaCoverage > 0) blockers.push("Role mapping has not started — personas are ready");
  if (criticalConflicts > 0) blockers.push(`${criticalConflicts} critical SOD conflicts need resolution`);
  if (highConflicts > 0) blockers.push(`${highConflicts} high-severity SOD conflicts pending`);
  if (approvedPercent === 0 && stats.totalAssignments > 0) blockers.push("No assignments approved yet");
  if (riskAnalysis.incorrectAccess.flaggedUsers > 50) blockers.push(`${riskAnalysis.incorrectAccess.flaggedUsers} users flagged for incorrect access`);
  if (blockers.length === 0) blockers.push("No critical blockers identified");

  // Next steps
  const nextSteps: string[] = [];
  if (personaCoverage < 100) nextSteps.push("Complete persona assignment for remaining users");
  else if (mappedPercent === 0) nextSteps.push("Begin target role mapping for generated personas");
  else if (mappedPercent < 100) nextSteps.push("Complete role mapping for remaining personas");
  if (totalConflicts > 0) nextSteps.push("Review and resolve SOD conflicts before approval");
  if (approvedPercent < 100 && mappedPercent > 0) nextSteps.push("Route mapped assignments through approval workflow");
  if (nextSteps.length === 0) nextSteps.push("Migration is complete — proceed with go-live planning");

  // Build the PPTX
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Provisum";
  pptx.title = "Migration Status";

  const slide = pptx.addSlide();
  slide.background = { color: WHITE };

  // ════════════════════════════════════════════════
  // LEFT PANEL — Dark teal sidebar (3.8" wide)
  // ════════════════════════════════════════════════
  const panelW = 3.8;

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: panelW, h: 7.5,
    fill: { color: TEAL_DARK },
  });

  // Wordmark
  slide.addText("PROVISUM", {
    x: 0.4, y: 0.35, w: 3, h: 0.4,
    fontSize: 20, bold: true, color: WHITE,
    fontFace: "Arial",
  });

  slide.addText("Migration Status", {
    x: 0.4, y: 0.75, w: 3, h: 0.25,
    fontSize: 11, color: LIGHT_GRAY,
    fontFace: "Arial",
  });

  // Date + scope
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  slide.addText(today, {
    x: 0.4, y: 1.15, w: 3, h: 0.2,
    fontSize: 9, color: TEAL_LIGHT,
    fontFace: "Arial",
  });
  slide.addText(scopeLabel, {
    x: 0.4, y: 1.35, w: 3, h: 0.2,
    fontSize: 8, color: LIGHT_GRAY,
    fontFace: "Arial",
  });

  // ── Health Score (big circle-like element) ──
  // Rounded rect as "badge"
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 1.85, w: 2.6, h: 1.5,
    fill: { color: TEAL },
    rectRadius: 0.15,
  });

  slide.addText(String(healthScore), {
    x: 0.6, y: 1.85, w: 2.6, h: 0.95,
    fontSize: 48, bold: true, color: WHITE,
    fontFace: "Arial", align: "center", valign: "bottom",
  });
  slide.addText(healthLabel, {
    x: 0.6, y: 2.8, w: 2.6, h: 0.35,
    fontSize: 12, bold: true, color: WHITE,
    fontFace: "Arial", align: "center", valign: "top",
  });
  slide.addText("HEALTH SCORE", {
    x: 0.6, y: 3.1, w: 2.6, h: 0.2,
    fontSize: 7, color: TEAL_LIGHT,
    fontFace: "Arial", align: "center",
  });

  // ── Pipeline Progress (vertical steps) ──
  const pipeY = 3.65;
  slide.addText("PIPELINE", {
    x: 0.4, y: pipeY, w: 3, h: 0.25,
    fontSize: 7, bold: true, color: TEAL_LIGHT,
    fontFace: "Arial",
  });

  const pipeSteps = [
    { label: "Data Upload", pct: stats.totalUsers > 0 ? 100 : 0 },
    { label: "Persona Generation", pct: personaCoverage },
    { label: "Role Mapping", pct: mappedPercent },
    { label: "SOD Analysis", pct: stats.sodRulesCount > 0 ? 100 : 0 },
    { label: "Approvals", pct: approvedPercent },
  ];

  pipeSteps.forEach((step, i) => {
    const y = pipeY + 0.35 + i * 0.55;
    const complete = step.pct === 100;
    const started = step.pct > 0;

    // Step indicator dot
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 0.55, y: y + 0.03, w: 0.18, h: 0.18,
      fill: { color: complete ? GREEN : started ? AMBER : TEXT_LIGHT },
    });

    // Connecting line (except last)
    if (i < pipeSteps.length - 1) {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.62, y: y + 0.21, w: 0.04, h: 0.34,
        fill: { color: complete ? GREEN : TEAL },
      });
    }

    slide.addText(step.label, {
      x: 0.85, y, w: 2, h: 0.22,
      fontSize: 9, bold: true, color: WHITE,
      fontFace: "Arial",
    });
    slide.addText(`${step.pct}%`, {
      x: 2.7, y, w: 0.7, h: 0.22,
      fontSize: 9, bold: complete, color: complete ? GREEN_LIGHT : LIGHT_GRAY,
      fontFace: "Arial", align: "right",
    });
  });

  // ── Prepared by ──
  slide.addText(`Prepared by ${user.displayName}`, {
    x: 0.4, y: 6.95, w: 3, h: 0.2,
    fontSize: 7, color: LIGHT_GRAY,
    fontFace: "Arial",
  });
  slide.addText("provisum.io · Confidential", {
    x: 0.4, y: 7.15, w: 3, h: 0.2,
    fontSize: 7, color: TEAL,
    fontFace: "Arial",
  });

  // ════════════════════════════════════════════════
  // RIGHT PANEL — Main content area
  // ════════════════════════════════════════════════
  const rx = panelW + 0.5; // 4.3"
  const rw = 13.33 - rx - 0.4; // ~8.63"

  // ── Key Metrics Row ──
  slide.addText("KEY METRICS", {
    x: rx, y: 0.3, w: rw, h: 0.25,
    fontSize: 8, bold: true, color: TEXT_LIGHT,
    fontFace: "Arial",
  });

  const metrics = [
    { label: "Users", value: stats.totalUsers.toLocaleString(), color: TEAL },
    { label: "Personas", value: String(stats.totalPersonas), color: TEAL },
    { label: "Mapped", value: `${mappedPercent}%`, color: mappedPercent > 50 ? TEAL : AMBER },
    { label: "SOD Conflicts", value: totalConflicts.toLocaleString(), color: totalConflicts > 100 ? RED : totalConflicts > 0 ? AMBER : GREEN },
    { label: "Approved", value: `${approvedPercent}%`, color: approvedPercent > 50 ? GREEN : approvedPercent > 0 ? AMBER : TEXT_LIGHT },
  ];

  const metricW = (rw - 0.4) / 5;
  metrics.forEach((m, i) => {
    const x = rx + i * (metricW + 0.1);
    const y = 0.65;

    slide.addText(m.value, {
      x, y, w: metricW, h: 0.45,
      fontSize: 24, bold: true, color: m.color,
      fontFace: "Arial", align: "center",
    });
    slide.addText(m.label, {
      x, y: y + 0.45, w: metricW, h: 0.2,
      fontSize: 8, color: TEXT_MUTED,
      fontFace: "Arial", align: "center",
    });
  });

  // Divider line
  slide.addShape(pptx.ShapeType.rect, {
    x: rx, y: 1.45, w: rw, h: 0.01,
    fill: { color: E8E2DA },
  });

  // ── Department Progress (compact) ──
  slide.addText("DEPARTMENT PROGRESS", {
    x: rx, y: 1.6, w: 4, h: 0.25,
    fontSize: 8, bold: true, color: TEXT_LIGHT,
    fontFace: "Arial",
  });

  const topDepts = [...depts].sort((a, b) => b.totalUsers - a.totalUsers).slice(0, 5);
  const dBarX = rx + 1.6;
  const dBarW = rw - 2.2;

  topDepts.forEach((dept, i) => {
    const y = 1.95 + i * 0.34;
    const total = dept.totalUsers || 1;
    const personaPct = dept.withPersona / total;

    slide.addText(dept.department.length > 14 ? dept.department.slice(0, 12) + "…" : dept.department, {
      x: rx, y, w: 1.5, h: 0.24,
      fontSize: 8, color: TEXT,
      fontFace: "Arial", valign: "middle", align: "right",
    });

    // Track bg
    slide.addShape(pptx.ShapeType.rect, {
      x: dBarX, y: y + 0.05, w: dBarW, h: 0.14,
      fill: { color: CREAM_WARM },
      rectRadius: 0.03,
    });

    // Fill
    if (personaPct > 0) {
      slide.addShape(pptx.ShapeType.rect, {
        x: dBarX, y: y + 0.05, w: Math.max(dBarW * personaPct, 0.06), h: 0.14,
        fill: { color: TEAL },
        rectRadius: 0.03,
      });
    }

    slide.addText(`${Math.round(personaPct * 100)}%`, {
      x: dBarX + dBarW + 0.08, y, w: 0.5, h: 0.24,
      fontSize: 7, color: TEXT_LIGHT,
      fontFace: "Arial", valign: "middle",
    });
  });

  // Divider
  const divY2 = 1.95 + topDepts.length * 0.34 + 0.15;
  slide.addShape(pptx.ShapeType.rect, {
    x: rx, y: divY2, w: rw, h: 0.01,
    fill: { color: E8E2DA },
  });

  // ── Risk Summary (horizontal cards) ──
  const riskStartY = divY2 + 0.15;
  slide.addText("RISK SUMMARY", {
    x: rx, y: riskStartY, w: 4, h: 0.25,
    fontSize: 8, bold: true, color: TEXT_LIGHT,
    fontFace: "Arial",
  });

  const riskItems = [
    {
      label: "Business Continuity",
      metric: `${riskAnalysis.businessContinuity.avgCoverage}% avg coverage`,
      severity: riskAnalysis.businessContinuity.avgCoverage >= 90 ? "low" : riskAnalysis.businessContinuity.avgCoverage >= 70 ? "med" : "high",
    },
    {
      label: "Adoption Risk",
      metric: `${riskAnalysis.adoption.usersWithNewAccess} users with role changes`,
      severity: riskAnalysis.adoption.usersWithNewAccess === 0 ? "low" : riskAnalysis.adoption.usersWithNewAccess <= 50 ? "med" : "high",
    },
    {
      label: "Incorrect Access",
      metric: `${riskAnalysis.incorrectAccess.flaggedUsers} flagged users`,
      severity: riskAnalysis.incorrectAccess.flaggedUsers === 0 ? "low" : riskAnalysis.incorrectAccess.flaggedUsers <= 50 ? "med" : "high",
    },
  ];

  const riskRowY = riskStartY + 0.3;
  const riskItemW = (rw - 0.3) / 3;

  riskItems.forEach((r, i) => {
    const x = rx + i * (riskItemW + 0.15);
    const badgeColor = r.severity === "high" ? RED : r.severity === "med" ? AMBER : GREEN;
    const badgeBg = r.severity === "high" ? RED_LIGHT : r.severity === "med" ? AMBER_LIGHT : GREEN_LIGHT;
    const badgeText = r.severity === "high" ? "HIGH" : r.severity === "med" ? "MED" : "LOW";

    // Colored left accent
    slide.addShape(pptx.ShapeType.rect, {
      x, y: riskRowY, w: 0.06, h: 0.6,
      fill: { color: badgeColor },
      rectRadius: 0.02,
    });

    slide.addText(r.label, {
      x: x + 0.15, y: riskRowY + 0.02, w: riskItemW - 0.2, h: 0.2,
      fontSize: 8, bold: true, color: TEXT,
      fontFace: "Arial",
    });

    // Badge
    slide.addShape(pptx.ShapeType.rect, {
      x: x + riskItemW - 0.65, y: riskRowY + 0.03, w: 0.5, h: 0.18,
      fill: { color: badgeBg },
      rectRadius: 0.03,
    });
    slide.addText(badgeText, {
      x: x + riskItemW - 0.65, y: riskRowY + 0.03, w: 0.5, h: 0.18,
      fontSize: 6, bold: true, color: badgeColor,
      fontFace: "Arial", align: "center", valign: "middle",
    });

    slide.addText(r.metric, {
      x: x + 0.15, y: riskRowY + 0.28, w: riskItemW - 0.2, h: 0.2,
      fontSize: 7, color: TEXT_MUTED,
      fontFace: "Arial",
    });
  });

  // Divider
  const divY3 = riskRowY + 0.75;
  slide.addShape(pptx.ShapeType.rect, {
    x: rx, y: divY3, w: rw, h: 0.01,
    fill: { color: E8E2DA },
  });

  // ── Blockers & Next Steps (two columns) ──
  const bnY = divY3 + 0.15;
  const colW = (rw - 0.3) / 2;

  // Blockers column
  slide.addText("BLOCKERS", {
    x: rx, y: bnY, w: colW, h: 0.25,
    fontSize: 8, bold: true, color: RED,
    fontFace: "Arial",
  });

  blockers.slice(0, 4).forEach((b, i) => {
    slide.addText(`•  ${b}`, {
      x: rx, y: bnY + 0.3 + i * 0.3, w: colW, h: 0.28,
      fontSize: 8, color: TEXT,
      fontFace: "Arial", valign: "top",
    });
  });

  // Next Steps column
  const nsX = rx + colW + 0.3;
  slide.addText("NEXT STEPS", {
    x: nsX, y: bnY, w: colW, h: 0.25,
    fontSize: 8, bold: true, color: TEAL,
    fontFace: "Arial",
  });

  nextSteps.slice(0, 4).forEach((s, i) => {
    slide.addText(`${i + 1}.  ${s}`, {
      x: nsX, y: bnY + 0.3 + i * 0.3, w: colW, h: 0.28,
      fontSize: 8, color: TEXT,
      fontFace: "Arial", valign: "top",
    });
  });

  // ── Bottom accent bar ──
  slide.addShape(pptx.ShapeType.rect, {
    x: panelW, y: 7.35, w: 13.33 - panelW, h: 0.15,
    fill: { color: CREAM_WARM },
  });

  slide.addText(`${depts.length} departments · ${stats.totalUsers.toLocaleString()} users in scope`, {
    x: rx, y: 7.05, w: rw, h: 0.2,
    fontSize: 7, color: TEXT_LIGHT,
    fontFace: "Arial",
  });

  // Generate buffer
  const arrayBuffer = await pptx.write({ outputType: "arraybuffer" }) as ArrayBuffer;
  return Buffer.from(arrayBuffer);
}
