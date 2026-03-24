import {
  getPersonaMappingWorkspace,
  getUserRefinements,
  getGapAnalysis,
  getTargetRoles,
  getPersonaDetail,
} from "@/lib/queries";
import { MappingClient } from "./mapping-client";

export const dynamic = "force-dynamic";

export default function MappingPage() {
  const personas = getPersonaMappingWorkspace();
  const refinements = getUserRefinements();
  const gaps = getGapAnalysis();
  const targetRoles = getTargetRoles();

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
      <div>
        <h2 className="text-xl font-semibold">Role Mapping Workspace</h2>
        <p className="text-sm text-muted-foreground">
          Map personas to target security roles using least-access principles.
        </p>
      </div>
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
