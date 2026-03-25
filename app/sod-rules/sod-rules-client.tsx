"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { SodRuleRow } from "@/lib/queries";

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-blue-100 text-blue-700",
};

const columns: Column<SodRuleRow & Record<string, unknown>>[] = [
  { key: "ruleId", header: "Rule ID", sortable: true },
  { key: "ruleName", header: "Name", sortable: true },
  { key: "permissionA", header: "Permission A", sortable: true },
  { key: "permissionB", header: "Permission B", sortable: true },
  {
    key: "severity",
    header: "Severity",
    sortable: true,
    render: (row) => {
      const r = row as SodRuleRow;
      return (
        <Badge variant="secondary" className={`text-xs ${severityColors[r.severity] ?? ""}`}>
          {r.severity}
        </Badge>
      );
    },
  },
  {
    key: "riskDescription",
    header: "Description",
    className: "max-w-[300px] truncate",
    render: (row) => {
      const r = row as SodRuleRow;
      return <span className="text-sm text-muted-foreground">{r.riskDescription ?? "\u2014"}</span>;
    },
  },
];

export function SodRulesClient({
  rules,
  isAdmin = false,
}: {
  rules: SodRuleRow[];
  isAdmin?: boolean;
}) {
  const router = useRouter();

  async function handleBulkDelete(ids: number[]) {
    const res = await fetch("/api/admin/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType: "sodRules", ids }),
    });
    if (res.ok) router.refresh();
    else alert("Delete failed");
  }

  if (rules.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <AlertTriangle className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground text-center max-w-md">
            No SOD ruleset uploaded. Upload a SOD/GRC ruleset on the{" "}
            <Link href="/upload" className="text-primary hover:underline">
              Data Upload
            </Link>{" "}
            page to enable conflict analysis.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <DataTable
      data={rules as (SodRuleRow & Record<string, unknown>)[]}
      columns={columns}
      searchKey="ruleName"
      searchPlaceholder="Search rules..."
      emptyMessage="No SOD rules found."
      selectable={isAdmin}
      onBulkDelete={isAdmin ? handleBulkDelete : undefined}
      entityLabel="SOD rules"
    />
  );
}
