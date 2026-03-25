import {
  getPersonaMappingWorkspace,
  getUserRefinements,
  getGapAnalysis,
  getTargetRoles,
  getPersonaDetail,
  getAssignedScope,
  getSourceUserIdsInScope,
  getPersonaIdsForUsers,
} from "@/lib/queries";
import { requireAuth } from "@/lib/auth";
import { MappingClient } from "./mapping-client";

export const dynamic = "force-dynamic";

export default function MappingPage() {
  const user = requireAuth();

  let personas = getPersonaMappingWorkspace();
  let refinements = getUserRefinements();
  let gaps = getGapAnalysis();
  const targetRoles = getTargetRoles();

  // Filter for mappers — only show personas containing their assigned users
  if (user.role === "mapper") {
    const scope = getAssignedScope(user.id, "mapper");
    if (scope.departments.length > 0 || scope.userIds.length > 0) {
      const scopedUserIds = getSourceUserIdsInScope(scope);
      const scopedPersonaIds = new Set(getPersonaIdsForUsers(scopedUserIds));
      personas = personas.filter((p) => scopedPersonaIds.has(p.personaId));
      refinements = refinements.filter((r) => scopedUserIds.includes(r.userId));
      gaps = gaps.filter((g) => scopedPersonaIds.has(g.personaId));
    } else {
      personas = [];
      refinements = [];
      gaps = [];
    }
  }

  // Pre-fetch persona details for the workspace
  const personaDetails: Record<number, { sourcePermissionCount: number; mappedRoles: { targetRoleId: number; roleName: string; roleId: string; coveragePercent: number | null; confidence: string | null }[] }> = {};
  for (const p of personas) {
    const detail = getPersonaDetail(p.personaId);
    if (detail) {
      personaDetails[p.personaId] = {
        sourcePermissionCount: detail.sourcePermissions.length,
        mappedRoles: detail.targetRoleMappings,
      };
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Map personas to target security roles using least-access principles.
      </p>
      <MappingClient
        personas={personas}
        personaDetails={personaDetails}
        refinements={refinements}
        gaps={gaps}
        targetRoles={targetRoles}
      />
    </div>
  );
}
