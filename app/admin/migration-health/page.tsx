import { requireRole } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { getMigrationHealthData } from "@/lib/queries";
import { MigrationHealthClient } from "./migration-health-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function MigrationHealthPage() {
  const user = await requireRole(["system_admin", "admin"]);
  const orgId = getOrgId(user);
  const health = await getMigrationHealthData(orgId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Migration Health Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          End-to-end visibility into migration pipeline completeness, coverage gaps, and quality metrics.
        </p>
      </div>
      <MigrationHealthClient data={health} />
    </div>
  );
}
