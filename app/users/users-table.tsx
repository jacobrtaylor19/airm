"use client";

import { useRouter } from "next/navigation";
import type { UserRow } from "@/lib/queries";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";

const userStatusConfig: Record<string, { label: string; className: string }> = {
  persona_assigned: { label: "Persona Assigned", className: "bg-blue-50 text-blue-700 hover:bg-blue-50" },
  mapped: { label: "Mapped", className: "bg-indigo-50 text-indigo-700 hover:bg-indigo-50" },
  approved: { label: "Approved", className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50" },
  sod_conflict: { label: "SOD Conflict", className: "bg-red-50 text-red-700 hover:bg-red-50" },
  ready_for_approval: { label: "Ready for Approval", className: "bg-blue-50 text-blue-700 hover:bg-blue-50" },
  compliance_approved: { label: "Compliance OK", className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50" },
  sod_risk_accepted: { label: "Risk Accepted", className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100" },
  sod_escalated: { label: "Escalated", className: "bg-purple-100 text-purple-700 hover:bg-purple-100" },
};

function UserStatusBadge({ status }: { status: string | null }) {
  if (!status || status === "unmapped" || status === "draft") {
    return (
      <Badge variant="secondary" className="text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-100">
        Not Started
      </Badge>
    );
  }
  const config = userStatusConfig[status] ?? { label: status, className: "bg-slate-100 text-slate-600" };
  return (
    <Badge variant="secondary" className={`text-xs font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}

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
    render: (row) => <UserStatusBadge status={row.assignmentStatus ?? null} />,
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
