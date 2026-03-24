import { getPersonas, getConsolidatedGroups } from "@/lib/queries";
import { PersonasPageClient } from "./personas-client";

export const dynamic = "force-dynamic";

export default function PersonasPage() {
  const personas = getPersonas();
  const groups = getConsolidatedGroups();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Personas</h2>
          <p className="text-sm text-muted-foreground">
            Manage AI-generated and manually defined security personas.
          </p>
        </div>
      </div>
      <PersonasPageClient
        personas={personas}
        groups={groups}
      />
    </div>
  );
}
