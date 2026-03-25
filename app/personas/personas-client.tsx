"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import type { PersonaRow, GroupRow } from "@/lib/queries";

const personaColumns: Column<PersonaRow & Record<string, unknown>>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "businessFunction", header: "Business Function", sortable: true },
  {
    key: "groupName",
    header: "Group",
    sortable: true,
    render: (row) => (row as PersonaRow).groupName ?? <span className="text-muted-foreground">{"\u2014"}</span>,
  },
  {
    key: "userCount",
    header: "Users",
    sortable: true,
    className: "text-right",
  },
  {
    key: "source",
    header: "Source",
    render: (row) => {
      const r = row as PersonaRow;
      return (
        <Badge variant="outline" className="text-xs">
          {r.source === "ai" ? "AI" : r.source === "manual_upload" ? "Upload" : "Manual"}
        </Badge>
      );
    },
  },
];

const groupColumns: Column<GroupRow & Record<string, unknown>>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "description", header: "Description" },
  {
    key: "accessLevel",
    header: "Access Level",
    sortable: true,
    render: (row) => (row as GroupRow).accessLevel ?? "\u2014",
  },
  {
    key: "domain",
    header: "Domain",
    sortable: true,
    render: (row) => (row as GroupRow).domain ?? "\u2014",
  },
  {
    key: "personaCount",
    header: "Personas",
    sortable: true,
    className: "text-right",
  },
  {
    key: "userCount",
    header: "Users",
    sortable: true,
    className: "text-right",
  },
];

export function PersonasPageClient({
  personas,
  groups,
  isAdmin = false,
}: {
  personas: PersonaRow[];
  groups: GroupRow[];
  isAdmin?: boolean;
}) {
  const router = useRouter();

  async function handleBulkDelete(ids: number[]) {
    const res = await fetch("/api/admin/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType: "personas", ids }),
    });
    if (res.ok) router.refresh();
    else alert("Delete failed");
  }

  return (
    <Tabs defaultValue="personas">
      <TabsList>
        <TabsTrigger value="personas">Personas ({personas.length})</TabsTrigger>
        <TabsTrigger value="groups">Consolidated Groups ({groups.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="personas" className="mt-4">
        <DataTable
          data={personas as (PersonaRow & Record<string, unknown>)[]}
          columns={personaColumns}
          searchKey="name"
          searchPlaceholder="Search personas..."
          onRowClick={(row) => router.push(`/personas/${(row as PersonaRow).id}`)}
          emptyMessage="No personas generated yet. Go to the Jobs page to generate personas from your user data."
          selectable={isAdmin}
          onBulkDelete={isAdmin ? handleBulkDelete : undefined}
          entityLabel="personas"
        />
      </TabsContent>
      <TabsContent value="groups" className="mt-4">
        <DataTable
          data={groups as (GroupRow & Record<string, unknown>)[]}
          columns={groupColumns}
          searchKey="name"
          searchPlaceholder="Search groups..."
          emptyMessage="No consolidated groups found."
        />
      </TabsContent>
    </Tabs>
  );
}
