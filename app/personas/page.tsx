import { getPersonas, getConsolidatedGroups } from "@/lib/queries";
import { PersonasPageClient } from "./personas-client";

export const dynamic = "force-dynamic";

export default function PersonasPage() {
  const personas = getPersonas();
  const groups = getConsolidatedGroups();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage AI-generated and manually defined security personas.
      </p>
      <PersonasPageClient
        personas={personas}
        groups={groups}
      />
    </div>
  );
}
