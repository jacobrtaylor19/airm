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

function projectStrapline(stats: StraplineStats): { text: string; tone: "positive" | "warning" | "action" | "neutral" } {
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

  if (openConflicts > 0) {
    return {
      text: `${n(openConflicts, "critical/high SOD conflict")} ${openConflicts === 1 ? "is" : "are"} blocking your approval queue — resolve ${openConflicts === 1 ? "it" : "them"} in SOD Analysis before any assignments can move forward.`,
      tone: "action",
    };
  }

  if (coveragePercent < 50) {
    const unmapped = totalUsers - usersWithPersona;
    return {
      text: `Persona grouping is the bottleneck — ${n(unmapped, "user")} still need${unmapped === 1 ? "s" : ""} to be assigned before role mapping can progress. At ${coveragePercent}% coverage, this needs urgent attention.`,
      tone: "warning",
    };
  }

  if (mappedPercent < 50) {
    const unmapped = totalPersonas - personasWithMapping;
    return {
      text: `Mapping is lagging — ${n(unmapped, "persona")} still need${unmapped === 1 ? "s" : ""} target role assignments. Approvals can't begin until mappers close these out.`,
      tone: "warning",
    };
  }

  if (readyForApproval > 0) {
    const lcNote = lowConfidence > 0
      ? ` Also flag ${n(lowConfidence, "low-confidence assignment")} for a second look before ${lowConfidence === 1 ? "it ages" : "they age"} out.`
      : "";
    return {
      text: `${n(readyForApproval, "assignment")} ${readyForApproval === 1 ? "is" : "are"} sitting in the approval queue — this is the critical path right now. Get approvers moving.${lcNote}`,
      tone: "action",
    };
  }

  if (approvalPercent >= 80) {
    const remaining = totalAssignments - approvedAssignments;
    return {
      text: `Final stretch — ${approvalPercent}% approved, only ${n(remaining, "assignment")} left. Push for the finish line before the release window closes.`,
      tone: "positive",
    };
  }

  const lcNote = lowConfidence > 0
    ? ` ${n(lowConfidence, "low-confidence assignment")} should be reviewed — don't let ${lowConfidence === 1 ? "it" : "them"} go stale.`
    : " Confidence scores look clean.";
  return {
    text: `${mappedPercent}% of personas mapped, ${approvalPercent}% of assignments approved.${lcNote}`,
    tone: lowConfidence > 0 ? "warning" : "neutral",
  };
}

function areaStrapline(role: string, scopedStats: ScopedStats, _displayName: string): string {
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
  const { text, tone } = projectStrapline(stats);

  const needsArea = ["mapper", "approver", "coordinator"].includes(role) && scopedStats !== null;
  const area = needsArea && scopedStats ? areaStrapline(role, scopedStats, displayName) : null;

  return { project: text, area, tone };
}
