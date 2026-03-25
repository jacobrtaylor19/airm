import {
  getPersonaMappingWorkspace,
  getUserRefinements,
  getGapAnalysis,
  getTargetRoles,
  getPersonaDetail,
  getPersonaIdsForUsers,
  getOpenSodConflictsByPersona,
  getPersonaSourceSystems,
  getGapAnalysisSummary,
  getUserRefinementDetails,
} from "@/lib/queries";
import type { PersonaSodConflict } from "@/lib/queries";
import { requireAuth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { MappingClient } from "./mapping-client";

export const dynamic = "force-dynamic";

export default function MappingPage() {
  const user = requireAuth();

  let personas = getPersonaMappingWorkspace();
  let refinements = getUserRefinements();
  let gaps = getGapAnalysis();
  const targetRoles = getTargetRoles();
  const gapSummary = getGapAnalysisSummary();
  let refinementDetails = getUserRefinementDetails();

  // Filter for mappers — only show personas containing their assigned users
  if (user.role === "mapper") {
    const scopedUserIds = getUserScope(user);
    if (scopedUserIds && scopedUserIds.length > 0) {
      const scopedPersonaIds = new Set(getPersonaIdsForUsers(scopedUserIds));
      personas = personas.filter((p) => scopedPersonaIds.has(p.personaId));
      refinements = refinements.filter((r) => scopedUserIds.includes(r.userId));
      gaps = gaps.filter((g) => scopedPersonaIds.has(g.personaId));
      refinementDetails = refinementDetails.filter((r) => scopedUserIds.includes(r.userId));
    } else if (scopedUserIds !== null) {
      // Empty scope (not null = restricted but no users)
      personas = [];
      refinements = [];
      gaps = [];
      refinementDetails = [];
    }
  }

  // Pre-fetch persona details for the workspace
  const personaDetails: Record<number, { sourcePermissionCount: number; mappedRoles: { targetRoleId: number; roleName: string; roleId: string; coveragePercent: number | null; confidence: string | null; roleOwner: string | null }[] }> = {};
  for (const p of personas) {
    const detail = getPersonaDetail(p.personaId);
    if (detail) {
      personaDetails[p.personaId] = {
        sourcePermissionCount: detail.sourcePermissions.length,
        mappedRoles: detail.targetRoleMappings.map(r => ({
          ...r,
          roleOwner: r.roleOwner ?? null,
        })),
      };
    }
  }

  // Get source systems per persona for multi-system visibility
  const personaSourceSystemsMap = getPersonaSourceSystems();
  const personaSourceSystemsObj: Record<number, string[]> = {};
  personaSourceSystemsMap.forEach((systems, personaId) => {
    if (personas.some(p => p.personaId === personaId)) {
      personaSourceSystemsObj[personaId] = systems;
    }
  });

  // Get open SOD conflicts grouped by persona for warning banners
  const sodConflictMap = getOpenSodConflictsByPersona();
  const sodConflictsByPersona: Record<number, PersonaSodConflict[]> = {};
  sodConflictMap.forEach((conflicts, personaId) => {
    // Only include personas that are in the current workspace
    if (personas.some(p => p.personaId === personaId)) {
      sodConflictsByPersona[personaId] = conflicts;
    }
  });

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
        sodConflictsByPersona={sodConflictsByPersona}
        personaSourceSystems={personaSourceSystemsObj}
        gapSummary={gapSummary}
        refinementDetails={refinementDetails}
      />
    </div>
  );
}
