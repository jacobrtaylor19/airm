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
import { toast } from "sonner";
import {
  Loader2,
  Wifi,
  WifiOff,
  Download,
  Check,
  X,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Shield,
  Clock,
  AlertTriangle,
} from "lucide-react";

// -----------------------------------------------
// Types
// -----------------------------------------------

interface ConnectionStatus {
  adapterName: string;
  adapterType: string;
  connected: boolean;
  message: string;
}

interface PullResult {
  snapshot: {
    pulledAt: string;
    roleCount: number;
    totalPermissions: number;
    roles: { externalId: string; name: string; type: string; permissionCount: number }[];
  };
  changes: DesignChange[];
  changeCount: number;
}

interface DesignChange {
  id?: number;
  changeType: string;
  roleName: string;
  roleExternalId: string;
  detail: string;
  status?: string;
  detectedAt: string;
  detectedBy?: string;
  reviewedAt?: string | null;
  acknowledgedBy?: string | null;
}

// -----------------------------------------------
// Helpers
// -----------------------------------------------

function changeTypeBadge(changeType: string) {
  switch (changeType) {
    case "role_added":
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Added</Badge>;
    case "role_removed":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Removed</Badge>;
    case "role_modified":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Modified</Badge>;
    case "permission_added":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Perm Added</Badge>;
    case "permission_removed":
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Perm Removed</Badge>;
    default:
      return <Badge variant="secondary">{changeType}</Badge>;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="border-yellow-400 text-yellow-700">Pending</Badge>;
    case "accepted":
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Accepted</Badge>;
    case "dismissed":
      return <Badge variant="secondary">Dismissed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// -----------------------------------------------
// Component
// -----------------------------------------------

export function SecurityDesignClient() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pullResult, setPullResult] = useState<PullResult | null>(null);
  const [pendingChanges, setPendingChanges] = useState<DesignChange[]>([]);
  const [reviewedChanges, setReviewedChanges] = useState<DesignChange[]>([]);
  const [loadingChanges, setLoadingChanges] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // -- Load changes --
  const loadChanges = useCallback(async () => {
    setLoadingChanges(true);
    try {
      const [pendingRes, reviewedRes] = await Promise.all([
        fetch("/api/admin/security-design/changes?status=pending"),
        fetch("/api/admin/security-design/changes"),
      ]);
      const pendingData = await pendingRes.json();
      const reviewedData = await reviewedRes.json();

      setPendingChanges(pendingData.changes || []);
      // Filter reviewed from "all" results
      setReviewedChanges(
        (reviewedData.changes || []).filter(
          (c: DesignChange) => c.status === "accepted" || c.status === "dismissed"
        )
      );
    } catch {
      toast.error("Failed to load changes");
    } finally {
      setLoadingChanges(false);
    }
  }, []);

  useEffect(() => {
    loadChanges();
  }, [loadChanges]);

  // -- Test connection --
  async function handleTestConnection() {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/security-design/test-connection", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Connection test failed");
        setConnectionStatus(null);
      } else {
        setConnectionStatus(data);
        if (data.connected) {
          toast.success("Connection successful");
        } else {
          toast.error("Connection failed: " + data.message);
        }
      }
    } catch {
      toast.error("Connection test failed");
    } finally {
      setTesting(false);
    }
  }

  // -- Pull security design --
  async function handlePull() {
    setPulling(true);
    try {
      const res = await fetch("/api/admin/security-design/pull", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Pull failed");
      } else {
        setPullResult(data);
        toast.success(
          `Pulled ${data.snapshot.roleCount} roles, ${data.changeCount} change(s) detected`
        );
        // Reload changes list
        loadChanges();
      }
    } catch {
      toast.error("Pull failed");
    } finally {
      setPulling(false);
    }
  }

  // -- Accept / Dismiss a single change --
  async function handleAction(id: number, action: "accept" | "dismiss") {
    setActionLoading((prev) => new Set(prev).add(id));
    try {
      const res = await fetch("/api/admin/security-design/changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], action }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Action failed");
      } else {
        toast.success(`Change ${action === "accept" ? "accepted" : "dismissed"}`);
        loadChanges();
      }
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  // -- Bulk accept all --
  async function handleBulkAccept() {
    const ids = pendingChanges
      .filter((c) => c.id !== undefined)
      .map((c) => c.id as number);
    if (ids.length === 0) return;

    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/security-design/changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: "accept" }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Bulk accept failed");
      } else {
        toast.success(`${ids.length} change(s) accepted`);
        loadChanges();
      }
    } catch {
      toast.error("Bulk accept failed");
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              {connectionStatus ? (
                <>
                  <div className="flex items-center gap-2">
                    {connectionStatus.connected ? (
                      <Wifi className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-medium">{connectionStatus.adapterName}</span>
                    <Badge variant="outline" className="text-xs">
                      {connectionStatus.adapterType}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {connectionStatus.message}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No connection test performed yet. Click &ldquo;Test Connection&rdquo; to verify adapter connectivity.
                </p>
              )}
            </div>
            <Button
              onClick={handleTestConnection}
              disabled={testing}
              variant="outline"
              size="sm"
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pull Security Design Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4" />
            Pull Security Design
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Pull the full security design from the target system and detect any changes since the last sync.
              </p>
              <Button
                onClick={handlePull}
                disabled={pulling}
                size="sm"
              >
                {pulling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Pulling...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Pull Now
                  </>
                )}
              </Button>
            </div>

            {pullResult && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Last Pull Summary</h4>
                  <span className="text-xs text-muted-foreground">
                    {new Date(pullResult.snapshot.pulledAt).toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{pullResult.snapshot.roleCount}</p>
                    <p className="text-xs text-muted-foreground">Roles</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{pullResult.snapshot.totalPermissions}</p>
                    <p className="text-xs text-muted-foreground">Permissions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{pullResult.changeCount}</p>
                    <p className="text-xs text-muted-foreground">Changes Detected</p>
                  </div>
                </div>
                {pullResult.snapshot.roles.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Roles pulled: </span>
                    {pullResult.snapshot.roles.map((r) => r.name).join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Changes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              Pending Changes
              {pendingChanges.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {pendingChanges.length}
                </Badge>
              )}
            </CardTitle>
            {pendingChanges.length > 0 && (
              <Button
                onClick={handleBulkAccept}
                disabled={bulkLoading}
                size="sm"
                variant="outline"
              >
                {bulkLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Accept All
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingChanges ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading changes...
            </div>
          ) : pendingChanges.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No pending changes. Pull from the target system to detect changes.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead className="w-[150px]">Detected</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingChanges.map((change) => (
                  <TableRow key={change.id ?? change.roleExternalId + change.changeType}>
                    <TableCell>{changeTypeBadge(change.changeType)}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{change.roleName}</span>
                        <p className="text-xs text-muted-foreground font-mono">
                          {change.roleExternalId}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{change.detail}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(change.detectedAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          disabled={change.id === undefined || actionLoading.has(change.id)}
                          onClick={() => change.id !== undefined && handleAction(change.id, "accept")}
                        >
                          {change.id !== undefined && actionLoading.has(change.id) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          <span className="ml-1 text-xs">Accept</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={change.id === undefined || actionLoading.has(change.id)}
                          onClick={() => change.id !== undefined && handleAction(change.id, "dismiss")}
                        >
                          <X className="h-3.5 w-3.5" />
                          <span className="ml-1 text-xs">Dismiss</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Change History (collapsible) */}
      <Card>
        <CardHeader
          className="pb-3 cursor-pointer select-none"
          onClick={() => setHistoryOpen(!historyOpen)}
        >
          <CardTitle className="flex items-center gap-2 text-base">
            {historyOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Change History
            <span className="text-xs text-muted-foreground font-normal">
              ({reviewedChanges.length} reviewed)
            </span>
          </CardTitle>
        </CardHeader>
        {historyOpen && (
          <CardContent>
            {reviewedChanges.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No reviewed changes yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[150px]">Reviewed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewedChanges.map((change) => (
                    <TableRow key={change.id ?? change.roleExternalId + change.changeType}>
                      <TableCell>{changeTypeBadge(change.changeType)}</TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{change.roleName}</span>
                          <p className="text-xs text-muted-foreground font-mono">
                            {change.roleExternalId}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{change.detail}</TableCell>
                      <TableCell>{statusBadge(change.status ?? "pending")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {change.reviewedAt ? (
                          <div>
                            <div>{new Date(change.reviewedAt).toLocaleDateString()}</div>
                            {change.acknowledgedBy && (
                              <div className="text-muted-foreground">by {change.acknowledgedBy}</div>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
