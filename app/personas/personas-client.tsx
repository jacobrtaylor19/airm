"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import type { PersonaRow, GroupRow } from "@/lib/queries";

interface OrgUnitInfo {
  id: number;
  name: string;
}

interface ConfirmationRow {
  id: number;
  orgUnitId: number;
  orgUnitName: string;
  confirmedAt: string | null;
  confirmedBy: number | null;
  confirmerName: string | null;
  resetAt: string | null;
  resetBy: number | null;
  resetByName: string | null;
  isActive: boolean;
}

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
  orgUnits,
  isAdmin = false,
  isMapper = false,
  currentUserOrgUnitId,
}: {
  personas: PersonaRow[];
  groups: GroupRow[];
  orgUnits: OrgUnitInfo[];
  isAdmin?: boolean;
  isMapper?: boolean;
  currentUserOrgUnitId?: number | null;
}) {
  const router = useRouter();
  const [confirmations, setConfirmations] = useState<ConfirmationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [resetDialogOrgUnit, setResetDialogOrgUnit] = useState<OrgUnitInfo | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchConfirmations = useCallback(async () => {
    try {
      const res = await fetch("/api/personas/confirmations");
      if (res.ok) {
        const data = await res.json();
        setConfirmations(data.confirmations);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfirmations();
  }, [fetchConfirmations]);

  const activeConfirmations = confirmations.filter((c) => c.isActive);
  const confirmedOrgUnitIds = new Set(activeConfirmations.map((c) => c.orgUnitId));

  async function handleConfirm(orgUnitId: number) {
    setConfirmingId(orgUnitId);
    try {
      const res = await fetch("/api/personas/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgUnitId }),
      });
      if (res.ok) {
        toast.success("Personas confirmed for this org unit");
        await fetchConfirmations();
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to confirm");
      }
    } catch {
      toast.error("Failed to confirm personas");
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleReset(orgUnitId: number) {
    setResetting(true);
    try {
      const res = await fetch("/api/personas/reset-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgUnitId }),
      });
      if (res.ok) {
        toast.success("Confirmation reset");
        setShowResetDialog(false);
        await fetchConfirmations();
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to reset");
      }
    } catch {
      toast.error("Failed to reset confirmation");
    } finally {
      setResetting(false);
    }
  }

  async function handleBulkDelete(ids: number[]) {
    const res = await fetch("/api/admin/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType: "personas", ids }),
    });
    if (res.ok) router.refresh();
    else alert("Delete failed");
  }

  // Determine which org units this user can confirm
  const canConfirmOrgUnits = orgUnits.filter((ou) => {
    if (isAdmin) return true;
    if (isMapper && currentUserOrgUnitId === ou.id) return true;
    return false;
  });

  return (
    <>
      {/* Persona Confirmation Status Banner */}
      {orgUnits.length > 0 && (
        <div className="rounded-lg border bg-card p-4 space-y-3 mb-4">
          <h3 className="text-sm font-semibold">Persona Confirmation Status</h3>
          <p className="text-xs text-muted-foreground">
            Personas must be confirmed per org unit before target role mapping can proceed.
          </p>
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading confirmation status...</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {orgUnits.map((ou) => {
                const confirmation = activeConfirmations.find((c) => c.orgUnitId === ou.id);
                const isConfirmed = confirmedOrgUnitIds.has(ou.id);
                const canConfirm = canConfirmOrgUnits.some((c) => c.id === ou.id);

                return (
                  <div
                    key={ou.id}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                      isConfirmed
                        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950"
                        : "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950"
                    }`}
                  >
                    {isConfirmed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium">{ou.name}</span>
                      {isConfirmed && confirmation ? (
                        <span className="text-xs text-muted-foreground">
                          Confirmed by {confirmation.confirmerName} on{" "}
                          {new Date(confirmation.confirmedAt!).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending confirmation</span>
                      )}
                    </div>
                    {isConfirmed ? (
                      <>
                        <Badge variant="outline" className="ml-2 border-emerald-300 text-emerald-700 bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-300 dark:border-emerald-700">
                          Confirmed
                        </Badge>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-1 h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setResetDialogOrgUnit(ou);
                              setShowResetDialog(true);
                            }}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Reset
                          </Button>
                        )}
                      </>
                    ) : canConfirm ? (
                      <Button
                        size="sm"
                        className="ml-2 h-7 text-xs bg-teal-500 hover:bg-teal-600 text-white"
                        disabled={confirmingId === ou.id}
                        onClick={() => handleConfirm(ou.id)}
                      >
                        {confirmingId === ou.id ? "Confirming..." : `Confirm Personas`}
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Reset Confirmation Warning Dialog */}
      <Dialog
        open={showResetDialog}
        onOpenChange={(open) => {
          if (!open) setShowResetDialog(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Persona Confirmation</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset the persona confirmation for{" "}
              <strong>{resetDialogOrgUnit?.name}</strong>? This will allow personas to be regenerated
              and will block target role mapping until personas are re-confirmed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={resetting}
              onClick={() => {
                if (resetDialogOrgUnit) handleReset(resetDialogOrgUnit.id);
              }}
            >
              {resetting ? "Resetting..." : "Reset Confirmation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </>
  );
}
