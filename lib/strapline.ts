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
        text: `${n(readyForApproval, "assignment")} ${readyForApproval === 1 ? "is" : "are"} waiting for your review. This is the critical path — approve or flag them to keep the project moving.`,
        tone: "action",
      };
    }
    if (openConflicts > 0) {
      return {
        text: `Your approval queue is blocked by ${n(openConflicts, "SOD conflict")}. These need resolution before new assignments can reach you.`,
        tone: "warning",
      };
    }
    return {
      text: `Approval queue is clear. ${approvalPercent}% of all assignments approved — watch for new items as mapping completes.`,
      tone: approvalPercent >= 80 ? "positive" : "neutral",
    };
  }

  // ── Mapper: mapping-focused ──
  if (role === "mapper") {
    if (mappedPercent < 100 && totalPersonas > 0) {
      const unmapped = totalPersonas - personasWithMapping;
      return {
        text: `${n(unmapped, "persona")} still need${unmapped === 1 ? "s" : ""} target role assignments — that's your priority. ${mappedPercent}% complete.`,
        tone: unmapped > 5 ? "warning" : "action",
      };
    }
    if (lowConfidence > 0) {
      return {
        text: `All personas mapped. Review ${n(lowConfidence, "low-confidence assignment")} before handing off to approvers.`,
        tone: "warning",
      };
    }
    return {
      text: `All ${n(totalPersonas, "persona")} mapped. Waiting on approvals — ${approvalPercent}% approved so far.`,
      tone: "positive",
    };
  }

  // ── Coordinator: workflow oversight ──
  if (role === "coordinator") {
    const parts: string[] = [];
    if (coveragePercent < 100) parts.push(`${100 - coveragePercent}% of users still need persona assignments`);
    if (mappedPercent < 100 && totalPersonas > 0) parts.push(`${mappedPercent}% of personas mapped`);
    if (readyForApproval > 0) parts.push(`${n(readyForApproval, "approval")} pending`);
    if (openConflicts > 0) parts.push(`${n(openConflicts, "SOD conflict")} blocking`);

    if (parts.length === 0) {
      return { text: `Workflow on track — ${approvalPercent}% approved. Push for completion.`, tone: "positive" };
    }
    return {
      text: parts.join(". ") + ".",
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
    return "Your assigned area has no users yet — check your org assignments.";
  }

  if (role === "approver") {
    if ((pendingApprovals ?? 0) > 0) {
      return `You have ${n(pendingApprovals!, "approval")} waiting in your queue across ${n(deptCount, "department")} — review and decide to keep this project moving.`;
    }
    return `Approval queue is clear across your ${n(deptCount, "department")}. Watch for new assignments as mapping completes.`;
  }

  if (role === "coordinator") {
    const mappedPct = totalPersonaCount > 0 ? Math.round((mappedPersonaCount / totalPersonaCount) * 100) : 0;
    const approvalNote = (pendingApprovals ?? 0) > 0
      ? ` ${n(pendingApprovals!, "approval")} pending — chase your approvers.`
      : "";
    return `Your area: ${n(userCount, "user")} across ${n(deptCount, "department")}, ${mappedPct}% mapped.${approvalNote} Follow up with mappers on any gaps.`;
  }

  // mapper
  const mappedPct = totalPersonaCount > 0 ? Math.round((mappedPersonaCount / totalPersonaCount) * 100) : 0;
  if (mappedPct === 100) {
    return `All ${n(totalPersonaCount, "persona")} in your area ${totalPersonaCount === 1 ? "is" : "are"} mapped — well done. Check for SOD conflicts or low-confidence assignments that need attention.`;
  }
  const remaining = totalPersonaCount - mappedPersonaCount;
  return `Your area: ${n(remaining, "persona")} still need${remaining === 1 ? "s" : ""} role assignments out of ${totalPersonaCount} total. That's your focus — the release depends on it.`;
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
