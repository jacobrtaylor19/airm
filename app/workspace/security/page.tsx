import { requireAuth, canAccessSecurityWorkspace } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { getSecurityWorkItems } from "@/lib/queries/sod-triage";
import { getWithinRoleViolations } from "@/lib/queries/sod";
import { redirect } from "next/navigation";
import { SecurityClient } from "./security-client";

export const dynamic = "force-dynamic";

export default async function SecurityWorkspacePage() {
  const user = await requireAuth();

  if (!canAccessSecurityWorkspace(user.role)) {
    redirect("/dashboard");
  }

  const orgId = getOrgId(user);
  const [workItems, roleViolations] = await Promise.all([
    getSecurityWorkItems(orgId),
    getWithinRoleViolations(orgId),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Security Workspace</h1>
        <p className="text-sm text-muted-foreground">
          Review and resolve role redesign requests from the compliance team.
        </p>
      </div>
      <SecurityClient workItems={workItems} roleViolations={roleViolations} />
    </div>
  );
}
