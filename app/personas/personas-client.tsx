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
    render: (row) => (row as PersonaRow).groupName ?? <span className="text-muted-foreground">—</span>,
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
    render: (row) => (row as GroupRow).accessLevel ?? "—",
  },
  {
    key: "domain",
    header: "Domain",
    sortable: true,
    render: (row) => (row as GroupRow).domain ?? "—",
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
}: {
  personas: PersonaRow[];
  groups: GroupRow[];
}) {
  const router = useRouter();

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
          emptyMessage="No personas found. Generate personas from the Jobs page."
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
