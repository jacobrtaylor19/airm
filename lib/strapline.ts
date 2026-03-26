/**
 * Generates an opinionated, action-oriented status strapline for the dashboard.
 * Admin → project-level summary.
 * Mapper/coordinator → project-level + their area summary.
 * Approver → project-level + approval queue summary.
 */

interface StraplineStats {
  totalUsers: number;
  totalPersonas: number;
  usersWithPersona: number;
  personasWithMapping: number;
  totalAssignments: number;
  approvedAssignments: number;
  readyForApproval: number;
  pendingReview: number;
  draftAssignments: number;
  sodRulesCount: number;
  sodConflictsBySeverity: { severity: string; count: number }[];
  lowConfidence: number;
}

interface ScopedStats {
  deptCount: number;
  userCount: number;
  mappedPersonaCount: number;
  totalPersonaCount: number;
  pendingApprovals?: number;
}

export interface StraplineResult {
  project: string;
  area: string | null;
  tone: "positive" | "warning" | "action" | "neutral";
}

function n(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? singular + "s")}`;
}

function projectStrapline(stats: StraplineStats, role: string): { text: string; tone: "positive" | "warning" | "action" | "neutral" } {
  const { totalUsers, totalPersonas, usersWithPersona, personasWithMapping, totalAssignments, approvedAssignments, readyForApproval, sodConflictsBySeverity, lowConfidence } = stats;

  if (totalUsers === 0) {
    return { text: "No data loaded — upload your users and source roles to get started.", tone: "neutral" };
  }

  const openConflicts = sodConflictsBySeverity
    .filter(c => ["critical", "high"].includes(c.severity))
    .reduce((sum, c) => sum + c.count, 0);

  const coveragePercent = totalUsers > 0 ? Math.round((usersWithPersona / totalUsers) * 100) : 0;
  const mappedPercent = totalPersonas > 0 ? Math.round((personasWithMapping / totalPersonas) * 100) : 0;
  const approvalPercent = totalAssignments > 0 ? Math.round((approvedAssignments / totalAssignments) * 100) : 0;
  const isAdmin = ["admin", "system_admin"].includes(role);

  // ── Admin / System Admin: executive project overview ──
  if (isAdmin) {
    if (totalPersonas === 0) {
      return {
        text: `${n(totalUsers, "user")} loaded. Next step: generate security personas from the Personas page to begin role mapping.`,
        tone: "action",
      };
    }

    const parts: string[] = [];
    parts.push(`${coveragePercent}% persona coverage`);
    parts.push(`${mappedPercent}% mapped`);
    parts.push(`${approvalPercent}% approved`);

    const blockers: string[] = [];
    if (openConflicts > 0) blockers.push(`${n(openConflicts, "SOD conflict")} to resolve`);
    if (lowConfidence > 0) blockers.push(`${n(lowConfidence, "low-confidence assignment")} to review`);
    if (coveragePercent < 100 && totalPersonas > 0) blockers.push(`${totalUsers - usersWithPersona} users unassigned`);

    const summary = parts.join(" · ");
    if (approvalPercent >= 80) {
      const remaining = totalAssignments - approvedAssignments;
      return {
        text: `Final stretch — ${summary}. Only ${n(remaining, "assignment")} left before provisioning.`,
        tone: "positive",
      };
    }
    if (blockers.length > 0) {
      return {
        text: `Project status: ${summary}. Blockers: ${blockers.join(", ")}.`,
        tone: blockers.some(b => b.includes("SOD")) ? "action" : "warning",
      };
    }
    return { text: `Project status: ${summary}. On track.`, tone: "neutral" };
  }

  // ── Approver: queue-focused ──
  if (role === "approver") {
    if (readyForApproval > 0) {
      return {
        text: `${n(readyForApproval, "assignment")} ready for your review. Head to Approvals to review and approve.`,
        tone: "action",
      };
    }
    if (openConflicts > 0) {
      return {
        text: `${n(openConflicts, "SOD conflict")} need resolution before assignments can reach your queue. Check SOD Analysis for details.`,
        tone: "warning",
      };
    }
    return {
      text: `Approval queue is clear. ${approvalPercent}% of assignments approved.`,
      tone: approvalPercent >= 80 ? "positive" : "neutral",
    };
  }

  // ── Mapper: mapping-focused ──
  if (role === "mapper") {
    if (totalPersonas === 0) {
      return {
        text: "No personas generated yet. Head to Personas and click Generate Personas to begin.",
        tone: "action",
      };
    }
    if (mappedPercent < 100 && totalPersonas > 0) {
      const unmapped = totalPersonas - personasWithMapping;
      return {
        text: `${n(unmapped, "persona")} need${unmapped === 1 ? "s" : ""} target role assignments. Head to Role Mapping to continue. ${mappedPercent}% complete.`,
        tone: "action",
      };
    }
    if (stats.draftAssignments > 0) {
      return {
        text: `${n(stats.draftAssignments, "assignment")} in Draft — review and submit for SOD analysis when ready.`,
        tone: "action",
      };
    }
    if (stats.pendingReview > 0) {
      return {
        text: `${n(stats.pendingReview, "assignment")} pending SOD review. Run SOD Analysis from Jobs to continue.`,
        tone: "warning",
      };
    }
    if (lowConfidence > 0) {
      return {
        text: `All personas mapped. ${n(lowConfidence, "low-confidence assignment")} to review in Role Mapping before handoff to approvers.`,
        tone: "warning",
      };
    }
    return {
      text: `All ${n(totalPersonas, "persona")} mapped. ${approvalPercent}% approved so far.`,
      tone: "positive",
    };
  }

  // ── Coordinator: workflow oversight ──
  if (role === "coordinator") {
    const parts: string[] = [];
    if (coveragePercent < 100) parts.push(`${100 - coveragePercent}% of users need persona assignments`);
    if (mappedPercent < 100 && totalPersonas > 0) parts.push(`${mappedPercent}% of personas mapped`);
    if (readyForApproval > 0) parts.push(`${n(readyForApproval, "approval")} pending review`);
    if (openConflicts > 0) parts.push(`${n(openConflicts, "SOD conflict")} to resolve`);

    if (parts.length === 0) {
      return { text: `Workflow on track — ${approvalPercent}% approved.`, tone: "positive" };
    }
    return {
      text: `Next steps: ${parts.join(", ")}.`,
      tone: openConflicts > 0 ? "action" : "warning",
    };
  }

  // ── Viewer / fallback: read-only summary ──
  return {
    text: `${coveragePercent}% persona coverage, ${mappedPercent}% mapped, ${approvalPercent}% approved.`,
    tone: "neutral",
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function areaStrapline(role: string, scopedStats: ScopedStats, displayName: string): string {
  const { deptCount, userCount, mappedPersonaCount, totalPersonaCount, pendingApprovals } = scopedStats;

  if (userCount === 0) {
    return "Your assigned area has no users yet. Check your org unit assignments in Admin.";
  }

  if (role === "approver") {
    if ((pendingApprovals ?? 0) > 0) {
      return `${n(pendingApprovals!, "approval")} waiting across ${n(deptCount, "department")}. Head to Approvals to review.`;
    }
    return `Approval queue is clear across your ${n(deptCount, "department")}.`;
  }

  if (role === "coordinator") {
    const mappedPct = totalPersonaCount > 0 ? Math.round((mappedPersonaCount / totalPersonaCount) * 100) : 0;
    const approvalNote = (pendingApprovals ?? 0) > 0
      ? ` ${n(pendingApprovals!, "approval")} pending review.`
      : "";
    return `Your area: ${n(userCount, "user")} across ${n(deptCount, "department")}, ${mappedPct}% mapped.${approvalNote}`;
  }

  // mapper
  if (totalPersonaCount === 0) {
    return `Your area: ${n(userCount, "user")} across ${n(deptCount, "department")}. Generate personas to begin mapping.`;
  }
  const mappedPct = totalPersonaCount > 0 ? Math.round((mappedPersonaCount / totalPersonaCount) * 100) : 0;
  if (mappedPct === 100) {
    return `All ${n(totalPersonaCount, "persona")} in your area mapped. Check for any SOD conflicts or low-confidence items to review.`;
  }
  const remaining = totalPersonaCount - mappedPersonaCount;
  return `Your area: ${n(remaining, "persona")} of ${totalPersonaCount} need${remaining === 1 ? "s" : ""} role assignments. Head to Role Mapping to continue.`;
}

export function generateStrapline(
  stats: StraplineStats,
  role: string,
  scopedStats: ScopedStats | null,
  displayName: string,
): StraplineResult {
  const { text, tone } = projectStrapline(stats, role);

  const needsArea = ["mapper", "approver", "coordinator"].includes(role) && scopedStats !== null;
  const area = needsArea && scopedStats ? areaStrapline(role, scopedStats, displayName) : null;

  return { project: text, area, tone };
}
