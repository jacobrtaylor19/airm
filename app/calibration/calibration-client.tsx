"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowRight,
  Loader2,
  Brain,
} from "lucide-react";
import { toast } from "sonner";
import { HelpTooltip } from "@/components/ui/help-tooltip";

interface Assignment {
  assignmentId: number;
  userId: number;
  personaId: number;
  confidenceScore: number | null;
  aiReasoning: string | null;
  userName: string;
  department: string | null;
  personaName: string;
  personaDescription: string | null;
}

interface Persona {
  id: number;
  name: string;
}

export default function CalibrationClient({ userRole }: { userRole: string }) {
  const canBulkAccept = ["system_admin", "admin"].includes(userRole);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [total, setTotal] = useState(0);
  const [threshold, setThreshold] = useState(70);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [reassignTarget, setReassignTarget] = useState<Record<number, number>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calibration?threshold=${threshold}&limit=100`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAssignments(data.assignments ?? []);
      setPersonas(data.personas ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load calibration data");
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAction(assignmentId: number, action: string, newPersonaId?: number) {
    setActionLoading(assignmentId);
    try {
      const res = await fetch("/api/calibration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, action, newPersonaId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(
        action === "accept"
          ? "Assignment accepted"
          : action === "reassign"
            ? "User reassigned to new persona"
            : "Assignment removed"
      );

      // Remove from list
      setAssignments((prev) => prev.filter((a) => a.assignmentId !== assignmentId));
      setTotal((prev) => prev - 1);
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBulkAccept() {
    if (!confirm(`Accept all ${assignments.length} visible assignments?`)) return;
    setLoading(true);
    let accepted = 0;
    for (const a of assignments) {
      try {
        const res = await fetch("/api/calibration", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignmentId: a.assignmentId, action: "accept" }),
        });
        if (res.ok) accepted++;
      } catch {
        /* continue */
      }
    }
    toast.success(`Accepted ${accepted} assignments`);
    fetchData();
  }

  function confidenceBadge(score: number | null) {
    const n = score ?? 0;
    const pct = Math.round(n);
    if (pct < 40) return <Badge variant="destructive">{pct}%</Badge>;
    if (pct < 70)
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
          {pct}%
        </Badge>
      );
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
        {pct}%
      </Badge>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground inline-flex items-center gap-1">
            Review low-confidence AI persona assignments. Accept, reassign, or
            remove.
            <HelpTooltip slug="ai-confidence-scores" label="Learn about confidence scores" />
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {assignments.length > 0 && canBulkAccept && (
            <Button size="sm" onClick={handleBulkAccept}>
              <CheckCircle className="mr-1 h-3 w-3" />
              Accept All ({assignments.length})
            </Button>
          )}
        </div>
      </div>

      {/* Stats & Threshold */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Below Threshold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">
              assignments need review
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Confidence Threshold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={30}
                max={100}
                value={threshold}
                onChange={(e) =>
                  setThreshold(parseInt(e.target.value, 10))
                }
                className="flex-1 accent-emerald-600"
              />
              <span className="text-lg font-bold w-12 text-right">
                {threshold}%
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available Personas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{personas.length}</div>
            <p className="text-xs text-muted-foreground">for reassignment</p>
          </CardContent>
        </Card>
      </div>

      {/* Assignment List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-12 w-12 text-emerald-300 mb-3" />
            <h3 className="text-lg font-medium">All Clear</h3>
            <p className="text-muted-foreground text-sm">
              No assignments below {threshold}% confidence threshold.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <Card key={a.assignmentId} className="overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{a.userName}</span>
                    {confidenceBadge(a.confidenceScore)}
                    {a.department && (
                      <Badge variant="outline" className="text-xs">
                        {a.department}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <ArrowRight className="h-3 w-3" />
                    <span className="font-medium text-foreground">
                      {a.personaName}
                    </span>
                  </div>
                  {a.aiReasoning && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {a.aiReasoning}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Select
                    value={reassignTarget[a.assignmentId]?.toString() ?? ""}
                    onValueChange={(v) =>
                      setReassignTarget((prev) => ({
                        ...prev,
                        [a.assignmentId]: parseInt(v, 10),
                      }))
                    }
                  >
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Reassign to..." />
                    </SelectTrigger>
                    <SelectContent>
                      {personas
                        .filter((p) => p.id !== a.personaId)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {reassignTarget[a.assignmentId] && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleAction(
                          a.assignmentId,
                          "reassign",
                          reassignTarget[a.assignmentId]
                        )
                      }
                      disabled={actionLoading === a.assignmentId}
                    >
                      {actionLoading === a.assignmentId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleAction(a.assignmentId, "accept")}
                    disabled={actionLoading === a.assignmentId}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {actionLoading === a.assignmentId ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAction(a.assignmentId, "remove")}
                    disabled={actionLoading === a.assignmentId}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
