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
import { getSetting } from "@/lib/settings";
import type { PersonaSodConflict } from "@/lib/queries";
import { requireAuth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { getReleasesForAppUser, getReleaseUserIds } from "@/lib/releases";
import { cookies } from "next/headers";
import { MappingClient } from "./mapping-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function MappingPage() {
  const user = await requireAuth();

  let personas = await getPersonaMappingWorkspace();
  let refinements = await getUserRefinements();
  let gaps = await getGapAnalysis();
  const targetRoles = await getTargetRoles();
  const gapSummary = await getGapAnalysisSummary();
  let refinementDetails = await getUserRefinementDetails();

  // Filter for mappers — only show personas containing their assigned users
  if (user.role === "mapper") {
    const scopedUserIds = await getUserScope(user);
    if (scopedUserIds && scopedUserIds.length > 0) {
      const scopedPersonaIds = new Set(await getPersonaIdsForUsers(scopedUserIds));
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

  // Release filter — applied on top of org-scope filter
  const userReleases = await getReleasesForAppUser(user);
  const cookieReleaseId = parseInt(cookies().get("airm_release_id")?.value ?? "") || null;
  const activeReleaseId = userReleases.some((r) => r.id === cookieReleaseId)
    ? cookieReleaseId
    : userReleases.length === 1
    ? userReleases[0].id  // single-release users are always scoped to their one release
    : (userReleases.find((r) => r.isActive)?.id ?? null);

  if (activeReleaseId) {
    const releaseUserIds = await getReleaseUserIds(activeReleaseId);
    if (releaseUserIds !== null) {
      const releaseSet = new Set(releaseUserIds);
      const releasePersonaIds = new Set(await getPersonaIdsForUsers(Array.from(releaseSet)));
      personas = personas.filter((p) => releasePersonaIds.has(p.personaId));
      refinements = refinements.filter((r) => releaseSet.has(r.userId));
      gaps = gaps.filter((g) => releasePersonaIds.has(g.personaId));
      refinementDetails = refinementDetails.filter((r) => releaseSet.has(r.userId));
    }
  }

  const excessThreshold = parseInt(await getSetting("least_access_threshold") ?? "30", 10);

  // Pre-fetch persona details for the workspace
  const personaDetails: Record<number, { sourcePermissionCount: number; mappedRoles: { targetRoleId: number; roleName: string; roleId: string; coveragePercent: number | null; excessPercent: number | null; confidence: string | null; roleOwner: string | null }[] }> = {};
  for (const p of personas) {
    const detail = await getPersonaDetail(p.personaId);
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
  const personaSourceSystemsMap = await getPersonaSourceSystems();
  const personaSourceSystemsObj: Record<number, string[]> = {};
  personaSourceSystemsMap.forEach((systems, personaId) => {
    if (personas.some(p => p.personaId === personaId)) {
      personaSourceSystemsObj[personaId] = systems;
    }
  });

  // Get open SOD conflicts grouped by persona for warning banners
  const sodConflictMap = await getOpenSodConflictsByPersona();
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
        excessThreshold={excessThreshold}
        userRole={user.role}
      />
    </div>
  );
}
