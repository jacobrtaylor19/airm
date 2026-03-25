import { getSodRules } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { SodRulesClient } from "./sod-rules-client";

export const dynamic = "force-dynamic";

export default function SodRulesPage() {
  const rules = getSodRules();
  const currentUser = getSessionUser();
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
