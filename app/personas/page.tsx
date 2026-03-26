import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
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

  // Fetch L2 org units only for confirmation banner (L2 = department level)
  const orgUnits = db
    .select({ id: schema.orgUnits.id, name: schema.orgUnits.name })
    .from(schema.orgUnits)
    .where(eq(schema.orgUnits.level, "L2"))
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
