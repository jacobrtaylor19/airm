"use client";

import { useRouter } from "next/navigation";
import type { UserRow } from "@/lib/queries";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { StatusBadge } from "@/components/shared/status-badge";

const columns: Column<UserRow>[] = [
  { key: "sourceUserId", header: "User ID", sortable: true },
  { key: "displayName", header: "Name", sortable: true },
  { key: "department", header: "Department", sortable: true },
  { key: "jobTitle", header: "Title", sortable: true },
  {
    key: "personaName",
    header: "Persona",
    sortable: true,
    render: (row) => row.personaName ?? <span className="text-muted-foreground">Unassigned</span>,
  },
  {
    key: "confidenceScore",
    header: "Confidence",
    sortable: true,
    render: (row) => <ConfidenceBadge score={row.confidenceScore} />,
  },
  {
    key: "assignmentStatus",
    header: "Status",
    render: (row) =>
      row.assignmentStatus ? (
        <StatusBadge status={row.assignmentStatus} />
      ) : (
        <span className="text-xs text-muted-foreground">{"\u2014"}</span>
      ),
  },
];

export function UsersTable({ data, isAdmin = false }: { data: UserRow[]; isAdmin?: boolean }) {
  const router = useRouter();

  async function handleBulkDelete(ids: number[]) {
    const res = await fetch("/api/admin/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType: "users", ids }),
    });
    if (res.ok) router.refresh();
    else alert("Delete failed");
  }

  return (
    <DataTable
      data={data as (UserRow & Record<string, unknown>)[]}
      columns={columns as Column<UserRow & Record<string, unknown>>[]}
      searchKey="displayName"
      searchPlaceholder="Search by name..."
      onRowClick={(row) => router.push(`/users/${row.id}`)}
      emptyMessage="No users found."
      selectable={isAdmin}
      onBulkDelete={isAdmin ? handleBulkDelete : undefined}
      entityLabel="users"
    />
  );
}
