import { getLeastAccessAnalysis, getPersonaIdsForUsers } from "@/lib/queries";
import { getSetting } from "@/lib/settings";
import { requireAuth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { LeastAccessClient } from "./least-access-client";

export const dynamic = "force-dynamic";

export default function LeastAccessPage() {
  const user = requireAuth();

  const threshold = parseInt(getSetting("least_access_threshold") ?? "30", 10);
  let rows = getLeastAccessAnalysis(threshold);

  // Filter by org scope for mappers/approvers
  if (user && ["mapper", "approver"].includes(user.role)) {
    const scopedUserIds = getUserScope(user);
    if (scopedUserIds !== null) {
      const scopedPersonaIds = new Set(getPersonaIdsForUsers(scopedUserIds));
      rows = rows.filter(r => scopedPersonaIds.has(r.personaId));
    }
  }

  const summary = {
    totalAffected: new Set(rows.map(r => r.personaId)).size,
    totalMappings: rows.length,
    exceptions: rows.filter(r => r.exceptionStatus === "accepted").length,
    pending: rows.filter(r => !r.exceptionStatus).length,
    highExcess: rows.filter(r => r.excessPercent >= 60).length,
    mediumExcess: rows.filter(r => r.excessPercent >= threshold && r.excessPercent < 60).length,
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review role mappings where granted permissions exceed what the persona actually needs. Accept exceptions to acknowledge intentional over-provisioning.
      </p>
      <LeastAccessClient
        rows={rows}
        summary={summary}
        threshold={threshold}
        userRole={user?.role ?? null}
        userName={user?.username ?? null}
      />
    </div>
  );
}
