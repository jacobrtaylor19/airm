"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, CheckCircle, AlertTriangle, Search, ShieldCheck, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { LeastAccessRow } from "@/lib/queries";

interface LeastAccessSummary {
  totalAffected: number;
  totalMappings: number;
  exceptions: number;
  pending: number;
  highExcess: number;
  mediumExcess: number;
}

interface LeastAccessClientProps {
  rows: LeastAccessRow[];
  summary: LeastAccessSummary;
  threshold: number;
  userRole: string | null;
  userName: string | null;
}

function excessSeverityLabel(excess: number, threshold: number) {
  if (excess >= 60) return { label: "High", variant: "destructive" as const, color: "text-red-700" };
  if (excess >= threshold) return { label: "Medium", variant: "secondary" as const, color: "text-orange-700" };
  return { label: "Low", variant: "outline" as const, color: "text-yellow-700" };
}

export function LeastAccessClient({ rows, summary, threshold, userRole }: LeastAccessClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "excepted">("all");
  const [filterSeverity, setFilterSeverity] = useState<"all" | "high" | "medium">("all");

  // Accept exception dialog
  const [acceptDialogRow, setAcceptDialogRow] = useState<LeastAccessRow | null>(null);
  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Revoke dialog
  const [revokeDialogRow, setRevokeDialogRow] = useState<LeastAccessRow | null>(null);
  const [revoking, setRevoking] = useState(false);

  const canAccept = userRole === "admin" || userRole === "system_admin" || userRole === "approver";

  const filtered = rows.filter(r => {
    if (filterStatus === "pending" && r.exceptionStatus === "accepted") return false;
    if (filterStatus === "excepted" && r.exceptionStatus !== "accepted") return false;
    if (filterSeverity === "high" && r.excessPercent < 60) return false;
    if (filterSeverity === "medium" && (r.excessPercent < threshold || r.excessPercent >= 60)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.personaName.toLowerCase().includes(q) ||
        r.roleName.toLowerCase().includes(q) ||
        (r.groupName ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function handleAcceptException() {
    if (!acceptDialogRow || !justification.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/least-access/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: acceptDialogRow.personaId,
          targetRoleId: acceptDialogRow.targetRoleId,
          excessPercent: acceptDialogRow.excessPercent,
          justification: justification.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to accept exception");
        return;
      }
      toast.success("Exception accepted");
      setAcceptDialogRow(null);
      setJustification("");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokeException() {
    if (!revokeDialogRow) return;
    setRevoking(true);
    try {
      const res = await fetch("/api/least-access/exceptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: revokeDialogRow.personaId,
          targetRoleId: revokeDialogRow.targetRoleId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to revoke exception");
        return;
      }
      toast.success("Exception revoked");
      setRevokeDialogRow(null);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Affected Personas</p>
            <p className="text-2xl font-bold mt-1">{summary.totalAffected}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">High Excess (≥60%)</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{summary.highExcess}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Medium Excess (≥{threshold}%)</p>
            <p className="text-2xl font-bold mt-1 text-orange-600">{summary.mediumExcess}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Exceptions Accepted</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{summary.exceptions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search personas or roles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={filterSeverity} onValueChange={v => setFilterSeverity(v as "all" | "high" | "medium")}>
          <SelectTrigger className="h-8 w-[140px] text-sm">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="high">High (≥60%)</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as "all" | "pending" | "excepted")}>
          <SelectTrigger className="h-8 w-[140px] text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending Review</SelectItem>
            <SelectItem value="excepted">Exception Accepted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {rows.length === 0
                ? `No over-provisioning detected above the ${threshold}% threshold.`
                : "No results match the current filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(row => {
            const sev = excessSeverityLabel(row.excessPercent, threshold);
            const hasException = row.exceptionStatus === "accepted";
            return (
              <Card key={`${row.personaId}-${row.targetRoleId}`} className={hasException ? "opacity-60" : ""}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TrendingUp className={`h-4 w-4 shrink-0 ${sev.color}`} />
                        <span className="font-medium text-sm">{row.personaName}</span>
                        {row.groupName && (
                          <Badge variant="outline" className="text-xs font-normal">
                            {row.groupName}
                          </Badge>
                        )}
                        <span className="text-muted-foreground text-xs">→</span>
                        <span className="text-sm">{row.roleName}</span>
                        <Badge variant={sev.variant} className="text-xs">
                          {sev.label}
                        </Badge>
                        {hasException && (
                          <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Exception
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{row.userCount} user{row.userCount !== 1 ? "s" : ""} in persona</span>
                        <span>Coverage: {row.coveragePercent != null ? `${row.coveragePercent.toFixed(0)}%` : "—"}</span>
                        <span className={`font-medium ${sev.color}`}>
                          Excess: {row.excessPercent.toFixed(0)}%
                        </span>
                        {hasException && row.exceptionJustification && (
                          <span className="italic">
                            &ldquo;{row.exceptionJustification}&rdquo; — {row.exceptionAcceptedBy}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasException ? (
                        canAccept && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={() => setRevokeDialogRow(row)}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Revoke
                          </Button>
                        )
                      ) : (
                        canAccept && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => { setAcceptDialogRow(row); setJustification(""); }}
                          >
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Accept Exception
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Accept exception dialog */}
      <Dialog open={!!acceptDialogRow} onOpenChange={open => !open && setAcceptDialogRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Accept Over-Provisioning Exception</DialogTitle>
            <DialogDescription>
              Acknowledge that <strong>{acceptDialogRow?.personaName}</strong> intentionally has excess permissions ({acceptDialogRow?.excessPercent.toFixed(0)}%) for <strong>{acceptDialogRow?.roleName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Business Justification</Label>
              <Textarea
                placeholder="Explain why this role assignment is acceptable despite over-provisioning..."
                value={justification}
                onChange={e => setJustification(e.target.value)}
                rows={3}
                className="text-sm resize-none"
              />
            </div>
            {acceptDialogRow?.excessPercent != null && acceptDialogRow.excessPercent >= 60 && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                High excess ({acceptDialogRow.excessPercent.toFixed(0)}%). Ensure this has been reviewed with the security team.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptDialogRow(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleAcceptException} disabled={!justification.trim() || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1.5" />}
              Accept Exception
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke dialog */}
      <Dialog open={!!revokeDialogRow} onOpenChange={open => !open && setRevokeDialogRow(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Revoke Exception</DialogTitle>
            <DialogDescription>
              This will re-flag <strong>{revokeDialogRow?.personaName}</strong> / <strong>{revokeDialogRow?.roleName}</strong> as a pending over-provisioning finding.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogRow(null)} disabled={revoking}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevokeException} disabled={revoking}>
              {revoking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Revoke Exception
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
