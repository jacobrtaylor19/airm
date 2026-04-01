import PptxGenJS from "pptxgenjs";
import { getDashboardStats, getDepartmentMappingStatus } from "@/lib/queries";
import { getAggregateRiskAnalysis } from "@/lib/queries";
import { getUserScope, getUserScopeDepartments } from "@/lib/scope";
import { getOrgId } from "@/lib/org-context";
import { generateStrapline } from "@/lib/strapline";
import type { AppUser } from "@/lib/auth";

// Brand colors (6-digit hex only — pptxgenjs does not support 8-digit alpha hex)
const TEAL = "0D9488";
const TEAL_DARK = "0F766E";
const TEAL_LIGHT = "B2DFDB"; // Approximate teal at ~40% on white
const CREAM = "FAF8F5";
const CREAM_TEAL = "E8F5F3"; // Approximate teal at ~15% on cream
const TEXT = "1A1A1A";
const TEXT_MUTED = "6B6560";
const TEXT_LIGHT = "9A928A";
const WHITE = "FFFFFF";
const GREEN = "059669";
const GREEN_LIGHT = "D1FAE5"; // green-100
const RED = "DC2626";
const RED_LIGHT = "FEE2E2"; // red-100
const AMBER = "D97706";
const AMBER_LIGHT = "FEF3C7"; // amber-100
const LIGHT_GRAY = "C0C0C0"; // for muted white text on dark bg

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

  const strapline = generateStrapline(stats, user.role, null, user.displayName);

  // Filter department status to user's scope
  const depts = isScoped
    ? deptStatus.filter(d => scopeDepts!.includes(d.department))
    : deptStatus;
  // Sort by most users, take top 6 (fits on slide)
  const topDepts = [...depts].sort((a, b) => b.totalUsers - a.totalUsers).slice(0, 6);

  // Build the PPTX
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  pptx.author = "Provisum";
  pptx.title = "Migration Status";

  const slide = pptx.addSlide();

  // ── Background ──
  slide.background = { color: CREAM };

  // ── Top teal header bar ──
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 1.1,
    fill: { color: TEAL_DARK },
  });

  slide.addText("PROVISUM", {
    x: 0.5, y: 0.2, w: 3, h: 0.35,
    fontSize: 18, bold: true, color: WHITE,
    fontFace: "Arial",
  });

  slide.addText("Migration Status Report", {
    x: 0.5, y: 0.55, w: 4, h: 0.3,
    fontSize: 11, color: LIGHT_GRAY,
    fontFace: "Arial",
  });

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  slide.addText(today, {
    x: 9.5, y: 0.2, w: 3.5, h: 0.35,
    fontSize: 11, color: LIGHT_GRAY,
    fontFace: "Arial", align: "right",
  });

  slide.addText(`Prepared by ${user.displayName} · ${scopeLabel}`, {
    x: 9.5, y: 0.55, w: 3.5, h: 0.3,
    fontSize: 9, color: LIGHT_GRAY,
    fontFace: "Arial", align: "right",
  });

  // ── Strapline banner ──
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 1.3, w: 12.33, h: 0.45,
    fill: { color: CREAM_TEAL },
    rectRadius: 0.08,
    line: { color: TEAL_LIGHT, width: 0.5 },
  });

  slide.addText(strapline.project, {
    x: 0.7, y: 1.3, w: 11.9, h: 0.45,
    fontSize: 9, color: TEXT_MUTED,
    fontFace: "Arial", valign: "middle",
  });

  // ── KPI Cards Row ──
  const kpis = [
    { label: "TOTAL USERS", value: stats.totalUsers.toLocaleString(), sub: `${stats.departmentStats.length} departments` },
    { label: "PERSONAS", value: String(stats.totalPersonas), sub: `${personaCoverage}% coverage` },
    { label: "MAPPED", value: `${stats.personasWithMapping} / ${stats.totalPersonas}`, sub: `${mappedPercent}%` },
    { label: "SOD CONFLICTS", value: stats.sodConflictsBySeverity.reduce((sum, s) => sum + s.count, 0).toLocaleString(), sub: severitySummary(stats.sodConflictsBySeverity) },
    { label: "APPROVED", value: `${approvedPercent}%`, sub: stats.totalAssignments > 0 ? `${stats.approvedAssignments} / ${stats.totalAssignments}` : "No assignments yet" },
  ];

  const cardW = 2.25;
  const cardGap = 0.2;
  const cardStartX = 0.5;
  const cardY = 2.0;

  kpis.forEach((kpi, i) => {
    const x = cardStartX + i * (cardW + cardGap);

    // Card background
    slide.addShape(pptx.ShapeType.rect, {
      x, y: cardY, w: cardW, h: 1.1,
      fill: { color: WHITE },
      rectRadius: 0.1,
      shadow: { type: "outer", blur: 4, offset: 1, opacity: 0.08, color: "000000" },
    });

    // Label
    slide.addText(kpi.label, {
      x: x + 0.15, y: cardY + 0.1, w: cardW - 0.3, h: 0.22,
      fontSize: 7, bold: true, color: TEXT_LIGHT,
      fontFace: "Arial",
    });

    // Value
    slide.addText(kpi.value, {
      x: x + 0.15, y: cardY + 0.32, w: cardW - 0.3, h: 0.4,
      fontSize: 22, bold: true, color: TEXT,
      fontFace: "Arial",
    });

    // Subtitle
    slide.addText(kpi.sub, {
      x: x + 0.15, y: cardY + 0.75, w: cardW - 0.3, h: 0.22,
      fontSize: 8, color: TEXT_MUTED,
      fontFace: "Arial",
    });
  });

  // ── Risk Assessment Section ──
  const riskY = 3.35;
  slide.addText("RISK ASSESSMENT", {
    x: 0.5, y: riskY, w: 4, h: 0.3,
    fontSize: 8, bold: true, color: TEXT_LIGHT,
    fontFace: "Arial",
  });

  const risks = [
    {
      label: "Business Continuity",
      value: `${riskAnalysis.businessContinuity.avgCoverage}%`,
      severity: riskAnalysis.businessContinuity.avgCoverage >= 90 ? "low" as const : riskAnalysis.businessContinuity.avgCoverage >= 70 ? "med" as const : "high" as const,
      detail: `${riskAnalysis.businessContinuity.usersAtRisk} users at risk`,
    },
    {
      label: "Adoption Risk",
      value: `${riskAnalysis.adoption.usersWithNewAccess}`,
      severity: riskAnalysis.adoption.usersWithNewAccess === 0 ? "low" as const : riskAnalysis.adoption.usersWithNewAccess <= 50 ? "med" as const : "high" as const,
      detail: `${riskAnalysis.adoption.totalNewPerms} new permissions`,
    },
    {
      label: "Incorrect Access",
      value: `${riskAnalysis.incorrectAccess.flaggedUsers}`,
      severity: riskAnalysis.incorrectAccess.flaggedUsers === 0 ? "low" as const : riskAnalysis.incorrectAccess.flaggedUsers <= 50 ? "med" as const : "high" as const,
      detail: "flagged users (gaps + SOD)",
    },
  ];

  const riskCardW = 3.9;
  const riskCardGap = 0.25;

  risks.forEach((risk, i) => {
    const x = 0.5 + i * (riskCardW + riskCardGap);
    const y = riskY + 0.35;

    slide.addShape(pptx.ShapeType.rect, {
      x, y, w: riskCardW, h: 0.8,
      fill: { color: WHITE },
      rectRadius: 0.08,
      shadow: { type: "outer", blur: 3, offset: 1, opacity: 0.06, color: "000000" },
    });

    slide.addText(risk.label, {
      x: x + 0.15, y: y + 0.08, w: 2.5, h: 0.25,
      fontSize: 10, bold: true, color: TEXT,
      fontFace: "Arial",
    });

    // Severity badge
    const badgeColor = risk.severity === "high" ? RED : risk.severity === "med" ? AMBER : GREEN;
    const badgeBg = risk.severity === "high" ? RED_LIGHT : risk.severity === "med" ? AMBER_LIGHT : GREEN_LIGHT;
    const badgeLabel = risk.severity === "high" ? "High" : risk.severity === "med" ? "Medium" : "Low";
    slide.addShape(pptx.ShapeType.rect, {
      x: x + riskCardW - 0.85, y: y + 0.1, w: 0.65, h: 0.22,
      fill: { color: badgeBg },
      rectRadius: 0.04,
    });
    slide.addText(badgeLabel, {
      x: x + riskCardW - 0.85, y: y + 0.1, w: 0.65, h: 0.22,
      fontSize: 7, bold: true, color: badgeColor,
      fontFace: "Arial", align: "center", valign: "middle",
    });

    slide.addText(`${risk.value} — ${risk.detail}`, {
      x: x + 0.15, y: y + 0.4, w: riskCardW - 0.3, h: 0.3,
      fontSize: 8, color: TEXT_MUTED,
      fontFace: "Arial",
    });
  });

  // ── Department Progress Section ──
  const deptY = 4.75;
  slide.addText("DEPARTMENT PROGRESS", {
    x: 0.5, y: deptY, w: 4, h: 0.3,
    fontSize: 8, bold: true, color: TEXT_LIGHT,
    fontFace: "Arial",
  });

  slide.addText(`${topDepts.length} of ${depts.length} departments shown`, {
    x: 8.5, y: deptY, w: 4.3, h: 0.3,
    fontSize: 7, color: TEXT_LIGHT,
    fontFace: "Arial", align: "right",
  });

  const barStartY = deptY + 0.35;
  const barH = 0.26;
  const barGap = 0.06;
  const barLabelW = 2.2;
  const barChartW = 8.5;
  const barX = 0.5 + barLabelW + 0.15;

  topDepts.forEach((dept, i) => {
    const y = barStartY + i * (barH + barGap);
    const total = dept.totalUsers || 1;
    const personaPct = (dept.withPersona / total);
    const approvedPct = (dept.approved / total);

    // Department name
    slide.addText(dept.department.length > 20 ? dept.department.slice(0, 18) + "…" : dept.department, {
      x: 0.5, y, w: barLabelW, h: barH,
      fontSize: 8, color: TEXT,
      fontFace: "Arial", valign: "middle", align: "right",
    });

    // Background bar
    slide.addShape(pptx.ShapeType.rect, {
      x: barX, y: y + 0.06, w: barChartW, h: barH - 0.12,
      fill: { color: CREAM },
      rectRadius: 0.03,
    });

    // Persona coverage bar
    if (personaPct > 0) {
      slide.addShape(pptx.ShapeType.rect, {
        x: barX, y: y + 0.06, w: Math.max(barChartW * personaPct, 0.05), h: barH - 0.12,
        fill: { color: TEAL_LIGHT },
        rectRadius: 0.03,
      });
    }

    // Approved bar (layered)
    if (approvedPct > 0) {
      slide.addShape(pptx.ShapeType.rect, {
        x: barX, y: y + 0.06, w: Math.max(barChartW * approvedPct, 0.05), h: barH - 0.12,
        fill: { color: TEAL },
        rectRadius: 0.03,
      });
    }

    // User count
    slide.addText(`${dept.totalUsers}`, {
      x: barX + barChartW + 0.1, y, w: 0.6, h: barH,
      fontSize: 7, color: TEXT_LIGHT,
      fontFace: "Arial", valign: "middle",
    });
  });

  // Legend
  const legendY = barStartY + topDepts.length * (barH + barGap) + 0.1;
  // Approved legend
  slide.addShape(pptx.ShapeType.rect, {
    x: barX, y: legendY, w: 0.15, h: 0.12,
    fill: { color: TEAL }, rectRadius: 0.02,
  });
  slide.addText("Approved", {
    x: barX + 0.2, y: legendY - 0.02, w: 1, h: 0.16,
    fontSize: 7, color: TEXT_MUTED, fontFace: "Arial",
  });
  // Persona coverage legend
  slide.addShape(pptx.ShapeType.rect, {
    x: barX + 1.3, y: legendY, w: 0.15, h: 0.12,
    fill: { color: TEAL_LIGHT }, rectRadius: 0.02,
  });
  slide.addText("Persona Assigned", {
    x: barX + 1.5, y: legendY - 0.02, w: 1.5, h: 0.16,
    fontSize: 7, color: TEXT_MUTED, fontFace: "Arial",
  });

  // ── Footer ──
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 7.2, w: 13.33, h: 0.3,
    fill: { color: TEAL_DARK },
  });

  slide.addText("Generated by Provisum · provisum.io", {
    x: 0.5, y: 7.2, w: 5, h: 0.3,
    fontSize: 7, color: LIGHT_GRAY,
    fontFace: "Arial", valign: "middle",
  });

  slide.addText("Confidential", {
    x: 9.5, y: 7.2, w: 3.5, h: 0.3,
    fontSize: 7, color: LIGHT_GRAY,
    fontFace: "Arial", align: "right", valign: "middle",
  });

  // Generate buffer
  const arrayBuffer = await pptx.write({ outputType: "arraybuffer" }) as ArrayBuffer;
  return Buffer.from(arrayBuffer);
}

function severitySummary(bySeverity: { severity: string; count: number }[]): string {
  const parts: string[] = [];
  for (const s of bySeverity) {
    if (s.count > 0) parts.push(`${s.count} ${s.severity}`);
  }
  return parts.join(", ") || "None";
}
