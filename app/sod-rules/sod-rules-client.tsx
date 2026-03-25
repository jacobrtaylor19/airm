"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Plus, Pencil, Power, PowerOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { SodRuleRow } from "@/lib/queries";

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-blue-100 text-blue-700",
};

interface EditForm {
  id?: number;
  ruleId: string;
  ruleName: string;
  permissionA: string;
  permissionB: string;
  severity: string;
  riskDescription: string;
}

const emptyForm: EditForm = {
  ruleId: "",
  ruleName: "",
  permissionA: "",
  permissionB: "",
  severity: "medium",
  riskDescription: "",
};

export function SodRulesClient({
  rules,
  isAdmin = false,
}: {
  rules: SodRuleRow[];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [editDialog, setEditDialog] = useState(false);
  const [form, setForm] = useState<EditForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  function openCreate() {
    setForm(emptyForm);
    setEditDialog(true);
  }

  function openEdit(rule: SodRuleRow) {
    setForm({
      id: rule.id,
      ruleId: rule.ruleId,
      ruleName: rule.ruleName,
      permissionA: rule.permissionA,
      permissionB: rule.permissionB,
      severity: rule.severity,
      riskDescription: rule.riskDescription ?? "",
    });
    setEditDialog(true);
  }

  async function saveRule() {
    if (!form.ruleId || !form.ruleName || !form.permissionA || !form.permissionB) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/sod-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.action === "created" ? "Rule created" : "Rule updated");
        setEditDialog(false);
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: number, currentlyActive: boolean) {
    setTogglingId(id);
    try {
      const res = await fetch("/api/sod-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentlyActive }),
      });
      if (res.ok) {
        toast.success(currentlyActive ? "Rule deactivated" : "Rule activated");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || "Toggle failed");
      }
    } catch {
      toast.error("Toggle failed");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleBulkDelete(ids: number[]) {
    const res = await fetch("/api/admin/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType: "sodRules", ids }),
    });
    if (res.ok) router.refresh();
    else toast.error("Delete failed");
  }

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
      key: "isActive",
      header: "Status",
      render: (row) => {
        const active = (row as unknown as SodRuleRow).isActive !== false;
        return (
          <Badge variant="outline" className={`text-xs ${active ? "text-emerald-700 border-emerald-200" : "text-slate-400 border-slate-200"}`}>
            {active ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    ...(isAdmin
      ? [
          {
            key: "_actions" as string,
            header: "Actions",
            render: (row: SodRuleRow & Record<string, unknown>) => {
              const r = row as unknown as SodRuleRow;
              const active = r.isActive !== false;
              return (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                    title="Edit rule"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 w-7 p-0 ${active ? "text-slate-400 hover:text-red-600" : "text-slate-400 hover:text-emerald-600"}`}
                    onClick={(e) => { e.stopPropagation(); toggleActive(r.id, active); }}
                    disabled={togglingId === r.id}
                    title={active ? "Deactivate rule" : "Activate rule"}
                  >
                    {togglingId === r.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : active ? (
                      <PowerOff className="h-3 w-3" />
                    ) : (
                      <Power className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              );
            },
          },
        ]
      : []),
  ];

  if (rules.length === 0) {
    return (
      <>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground text-center max-w-md">
              No SOD ruleset uploaded. Upload a SOD/GRC ruleset on the{" "}
              <Link href="/upload" className="text-primary hover:underline">
                Data Upload
              </Link>{" "}
              page, or create rules manually.
            </p>
            {isAdmin && (
              <Button onClick={openCreate} className="mt-2">
                <Plus className="h-4 w-4 mr-2" /> Add Rule
              </Button>
            )}
          </CardContent>
        </Card>
        {renderEditDialog()}
      </>
    );
  }

  function renderEditDialog() {
    return (
      <Dialog open={editDialog} onOpenChange={(open) => { if (!open) setEditDialog(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit SOD Rule" : "Add SOD Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Rule ID *</label>
                <Input value={form.ruleId} onChange={(e) => setForm({ ...form, ruleId: e.target.value })} placeholder="SOD-001" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Rule Name *</label>
                <Input value={form.ruleName} onChange={(e) => setForm({ ...form, ruleName: e.target.value })} placeholder="Create and Approve PO" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Permission A *</label>
                <Input value={form.permissionA} onChange={(e) => setForm({ ...form, permissionA: e.target.value })} placeholder="CREATE_PO" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Permission B *</label>
                <Input value={form.permissionB} onChange={(e) => setForm({ ...form, permissionB: e.target.value })} placeholder="APPROVE_PO" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Severity *</label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Risk Description</label>
              <Input value={form.riskDescription} onChange={(e) => setForm({ ...form, riskDescription: e.target.value })} placeholder="Same user can create and approve purchase orders" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button onClick={saveRule} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {form.id ? "Save Changes" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      {isAdmin && (
        <div className="flex items-center gap-3 mb-4">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Rule
          </Button>
          <span className="text-xs text-muted-foreground">
            {rules.filter(r => r.isActive !== false).length} active of {rules.length} total rules
          </span>
        </div>
      )}
      <DataTable
        data={rules as unknown as (SodRuleRow & Record<string, unknown>)[]}
        columns={columns}
        searchKey="ruleName"
        searchPlaceholder="Search rules..."
        emptyMessage="No SOD rules found."
        selectable={isAdmin}
        onBulkDelete={isAdmin ? handleBulkDelete : undefined}
        entityLabel="SOD rules"
      />
      {renderEditDialog()}
    </>
  );
}
