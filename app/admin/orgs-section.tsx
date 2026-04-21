"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Building2, RefreshCw, PowerOff, Power } from "lucide-react";

// -----------------------------------------------
// Types
// -----------------------------------------------

interface OrgRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  planTier: string | null;
  maxUsers: number | null;
  licenseYears: number | null;
  licenseExpiresAt: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  userCount: number;
}

// -----------------------------------------------
// Helpers
// -----------------------------------------------

function PlanBadge({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-muted-foreground text-xs">—</span>;
  const colours: Record<string, string> = {
    standard: "bg-blue-50 text-blue-700 border-blue-200",
    professional: "bg-purple-50 text-purple-700 border-purple-200",
    enterprise: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const cls = colours[tier] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${cls}`}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function licenseStatus(org: OrgRow): { label: string; className: string } {
  if (!org.licenseExpiresAt) return { label: "No expiry", className: "text-muted-foreground" };
  const diff = new Date(org.licenseExpiresAt).getTime() - Date.now();
  const days = Math.floor(diff / 86_400_000);
  if (days < 0) return { label: "Expired", className: "text-destructive font-medium" };
  if (days < 30) return { label: `Expires in ${days}d`, className: "text-amber-600 font-medium" };
  return { label: `Expires ${formatDate(org.licenseExpiresAt)}`, className: "text-muted-foreground" };
}

// -----------------------------------------------
// OrgsSection
// -----------------------------------------------

export function OrgsSection() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionOrg, setActionOrg] = useState<OrgRow | null>(null);
  const [dialogType, setDialogType] = useState<"suspend" | "activate" | null>(null);
  const [saving, setSaving] = useState(false);

  const loadOrgs = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/orgs")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setOrgs(data);
        else toast.error(data.error ?? "Failed to load organizations");
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load organizations");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadOrgs();
  }, [loadOrgs]);

  function openDialog(org: OrgRow, type: "suspend" | "activate") {
    setActionOrg(org);
    setDialogType(type);
  }

  async function handleToggleActive() {
    if (!actionOrg || !dialogType) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/orgs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: actionOrg.id, isActive: dialogType === "activate" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update organization");
      } else {
        toast.success(
          dialogType === "suspend"
            ? `"${actionOrg.name}" suspended`
            : `"${actionOrg.name}" reactivated`
        );
        setActionOrg(null);
        setDialogType(null);
        loadOrgs();
      }
    } catch {
      toast.error("Failed to update organization");
    } finally {
      setSaving(false);
    }
  }

  const activeCount = orgs.filter((o) => o.isActive).length;
  const totalUsers = orgs.reduce((sum, o) => sum + (o.userCount ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total orgs", value: orgs.length },
          { label: "Active", value: activeCount },
          { label: "Suspended", value: orgs.length - activeCount },
          { label: "Total users", value: totalUsers },
        ].map((s) => (
          <Card key={s.label} className="py-3">
            <CardContent className="px-4 py-0">
              <p className="text-2xl font-semibold">{loading ? "—" : s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Org table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organizations
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadOrgs} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading…
            </div>
          ) : orgs.length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground">No organizations found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead>Max users</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => {
                  const lic = licenseStatus(org);
                  return (
                    <TableRow key={org.id} className={!org.isActive ? "opacity-60" : ""}>
                      <TableCell className="font-medium max-w-[160px] truncate" title={org.name}>
                        {org.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">
                        {org.slug}
                      </TableCell>
                      <TableCell>
                        <PlanBadge tier={org.planTier} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {org.userCount}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {org.maxUsers ?? "—"}
                      </TableCell>
                      <TableCell className={`text-xs ${lic.className}`}>
                        {lic.label}
                      </TableCell>
                      <TableCell>
                        <Badge variant={org.isActive ? "default" : "secondary"}>
                          {org.isActive ? "Active" : "Suspended"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(org.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {org.isActive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/30"
                            onClick={() => openDialog(org, "suspend")}
                          >
                            <PowerOff className="h-3.5 w-3.5 mr-1" />
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                            onClick={() => openDialog(org, "activate")}
                          >
                            <Power className="h-3.5 w-3.5 mr-1" />
                            Reactivate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <Dialog
        open={!!actionOrg}
        onOpenChange={(open) => {
          if (!open) {
            setActionOrg(null);
            setDialogType(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === "suspend" ? "Suspend organization" : "Reactivate organization"}
            </DialogTitle>
            <DialogDescription>
              {dialogType === "suspend"
                ? `Suspending "${actionOrg?.name}" will prevent all its users from logging in. This can be reversed at any time.`
                : `Reactivating "${actionOrg?.name}" will restore login access for all its users.`}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-1 py-2">
            <p>
              <span className="text-muted-foreground">Org: </span>
              <span className="font-medium">{actionOrg?.name}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Users affected: </span>
              <span className="font-medium">{actionOrg?.userCount ?? 0}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionOrg(null); setDialogType(null); }}>
              Cancel
            </Button>
            <Button
              variant={dialogType === "suspend" ? "destructive" : "default"}
              onClick={handleToggleActive}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {dialogType === "suspend" ? "Suspend" : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
