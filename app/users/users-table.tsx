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
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
];

export function UsersTable({ data }: { data: UserRow[] }) {
  const router = useRouter();

  return (
    <DataTable
      data={data as (UserRow & Record<string, unknown>)[]}
      columns={columns as Column<UserRow & Record<string, unknown>>[]}
      searchKey="displayName"
      searchPlaceholder="Search by name..."
      onRowClick={(row) => router.push(`/users/${row.id}`)}
      emptyMessage="No users found."
    />
  );
}
