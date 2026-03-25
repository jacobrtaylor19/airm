import { db } from "@/db";
import * as schema from "@/db/schema";
import { getPersonas, getConsolidatedGroups } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { PersonasPageClient } from "./personas-client";

export const dynamic = "force-dynamic";

export default function PersonasPage() {
  const personas = getPersonas();
  const groups = getConsolidatedGroups();
  const currentUser = getSessionUser();
  const isAdmin = currentUser ? ["admin", "system_admin"].includes(currentUser.role) : false;
  const isMapper = currentUser?.role === "mapper";

  // Fetch org units for confirmation banner
  const orgUnits = db
    .select({ id: schema.orgUnits.id, name: schema.orgUnits.name })
    .from(schema.orgUnits)
    .all();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage AI-generated and manually defined security personas.
      </p>
      <PersonasPageClient
        personas={personas}
        groups={groups}
        orgUnits={orgUnits}
        isAdmin={isAdmin}
        isMapper={isMapper}
        currentUserOrgUnitId={currentUser?.assignedOrgUnitId}
      />
    </div>
  );
}
