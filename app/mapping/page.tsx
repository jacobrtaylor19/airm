import {
  getPersonaMappingWorkspace,
  getUserRefinements,
  getGapAnalysis,
  getTargetRoles,
  getPersonaDetail,
  getPersonaIdsForUsers,
  getPersonaSourceSystems,
  getGapAnalysisSummary,
  getUserRefinementDetails,
  getBatchUserGapSummary,
} from "@/lib/queries";
import { getSetting } from "@/lib/settings";
import { requireAuth } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { getUserScope } from "@/lib/scope";
import { getReleasesForAppUser, getReleaseUserIds } from "@/lib/releases";
import { cookies } from "next/headers";
import { MappingClient } from "./mapping-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function MappingPage() {
  const user = await requireAuth();
  const orgId = getOrgId(user);

  let personas = await getPersonaMappingWorkspace(orgId);
  let refinements = await getUserRefinements(orgId);
  let gaps = await getGapAnalysis(orgId);
  const allTargetRoles = await getTargetRoles(orgId);
  // Only show active roles in the mapping selector (exclude draft and archived)
  const targetRoles = allTargetRoles.filter((r) => r.status === "active");
  const gapSummary = await getGapAnalysisSummary(orgId);
  let refinementDetails = await getUserRefinementDetails(orgId);
  const userGapData = await getBatchUserGapSummary(orgId);

  // Filter for mappers — only show personas containing their assigned users
  if (user.role === "mapper") {
    const scopedUserIds = await getUserScope(user);
    if (scopedUserIds && scopedUserIds.length > 0) {
      const scopedPersonaIds = new Set(await getPersonaIdsForUsers(orgId, scopedUserIds));
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
      const releasePersonaIds = new Set(await getPersonaIdsForUsers(orgId, Array.from(releaseSet)));
      // Include release-scoped personas AND personas with 0 users (AI-generated archetypes
      // from permission patterns that need review — they shouldn't silently disappear)
      personas = personas.filter((p) => releasePersonaIds.has(p.personaId) || p.userCount === 0);
      refinements = refinements.filter((r) => releaseSet.has(r.userId));
      gaps = gaps.filter((g) => releasePersonaIds.has(g.personaId));
      refinementDetails = refinementDetails.filter((r) => releaseSet.has(r.userId));
    }
  }

  const excessThreshold = parseInt(await getSetting("least_access_threshold") ?? "30", 10);

  // Pre-fetch persona details for the workspace
  const personaDetails: Record<number, { sourcePermissionCount: number; mappedRoles: { targetRoleId: number; roleName: string; roleId: string; coveragePercent: number | null; excessPercent: number | null; confidence: string | null; roleOwner: string | null }[] }> = {};
  for (const p of personas) {
    const detail = await getPersonaDetail(orgId, p.personaId);
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
  const personaSourceSystemsMap = await getPersonaSourceSystems(orgId);
  const personaSourceSystemsObj: Record<number, string[]> = {};
  personaSourceSystemsMap.forEach((systems, personaId) => {
    if (personas.some(p => p.personaId === personaId)) {
      personaSourceSystemsObj[personaId] = systems;
    }
  });

  // Count remap_required assignments for the tab badge
  const remapCount = refinementDetails.filter(u =>
    u.allAssignments.some(a => a.status === "remap_required")
  ).length;

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
        personaSourceSystems={personaSourceSystemsObj}
        gapSummary={gapSummary}
        refinementDetails={refinementDetails}
        excessThreshold={excessThreshold}
        userRole={user.role}
        userGapData={userGapData}
        remapCount={remapCount}
      />
    </div>
  );
}
