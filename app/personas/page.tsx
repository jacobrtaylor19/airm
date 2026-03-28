import { getPersonas, getConsolidatedGroups } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { PersonasPageClient } from "./personas-client";

export const dynamic = "force-dynamic";

export default async function PersonasPage() {
  const personas = await getPersonas();
  const groups = await getConsolidatedGroups();
  const currentUser = await getSessionUser();
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
