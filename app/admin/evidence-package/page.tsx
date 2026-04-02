import { requireRole } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getOrgId } from "@/lib/org-context";
import { eq } from "drizzle-orm";
import { EvidencePackageClient } from "./evidence-package-client";

export const dynamic = "force-dynamic";

export default async function EvidencePackagePage() {
  const user = await requireRole(["admin", "system_admin"]);
  const orgId = getOrgId(user);

  const releases = await db
    .select({ id: schema.releases.id, name: schema.releases.name, status: schema.releases.status })
    .from(schema.releases)
    .where(eq(schema.releases.organizationId, orgId));

  const runs = await db.select().from(schema.evidencePackageRuns);
  const orgRuns = runs
    .filter((r) => r.organizationId === orgId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Evidence Package</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate SOX 404 / SOC 2 CC6 audit evidence packages from your migration data.
        </p>
      </div>
      <EvidencePackageClient
        releases={releases}
        pastRuns={orgRuns.map((r) => ({
          id: r.id,
          framework: r.framework,
          releaseId: r.releaseId,
          generatedByUsername: r.generatedByUsername,
          userCount: r.userCount,
          personaCount: r.personaCount,
          assignmentCount: r.assignmentCount,
          sodConflictCount: r.sodConflictCount,
          createdAt: r.createdAt,
        }))}
      />
    </div>
  );
}
