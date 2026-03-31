import { getPersonas, getConsolidatedGroups } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { PersonasPageClient } from "./personas-client";

export const dynamic = "force-dynamic";

export default async function PersonasPage() {
  const currentUser = await getSessionUser();
  const orgId = getOrgId(currentUser!);
  const personas = await getPersonas(orgId);
  const groups = await getConsolidatedGroups(orgId);
  const userRole = currentUser?.role ?? "viewer";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage AI-generated and manually defined security personas.
      </p>
      <PersonasPageClient
        personas={personas}
        groups={groups}
        userRole={userRole}
      />
    </div>
  );
}
