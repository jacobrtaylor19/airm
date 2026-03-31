import { getSodRules } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { SodRulesClient } from "./sod-rules-client";

export const dynamic = "force-dynamic";

export default async function SodRulesPage() {
  const currentUser = await getSessionUser();
  const orgId = getOrgId(currentUser!);
  const rules = await getSodRules(orgId);
  const canEdit = currentUser
    ? ["admin", "system_admin"].includes(currentUser.role) ||
      currentUser.role.toLowerCase().includes("compliance") ||
      currentUser.role.toLowerCase().includes("security")
    : false;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Browse the uploaded SOD/GRC ruleset.
      </p>
      <SodRulesClient rules={rules} isAdmin={canEdit} />
    </div>
  );
}
