"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Webhook,
  ChevronDown,
  ChevronRight,
  Copy,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// -----------------------------------------------
// Types
// -----------------------------------------------

interface WebhookEndpoint {
  id: number;
  url: string;
  description: string | null;
  secret: string;
  events: string; // JSON array
  enabled: boolean;
  failureCount: number;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface WebhookDelivery {
  id: number;
  endpointId: number;
  eventType: string;
  payload: string;
  status: string;
  httpStatus: number | null;
  responseBody: string | null;
  attempts: number;
  createdAt: string | null;
}

const EVENT_TYPES = [
  "persona.generated",
  "mapping.created",
  "mapping.approved",
  "mapping.rejected",
  "sod.analysis_complete",
  "sod.conflict_resolved",
  "assignment.status_changed",
  "export.completed",
  "user.invited",
  "job.completed",
  "job.failed",
];

// -----------------------------------------------
// WebhooksSection
// -----------------------------------------------

export function WebhooksSection() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded endpoint for deliveries
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<WebhookEndpoint | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingEndpoint, setDeletingEndpoint] = useState<WebhookEndpoint | null>(null);
  const [saving, setSaving] = useState(false);

  // Secret shown once on creation
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  // Form state
  const [formUrl, setFormUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formEnabled, setFormEnabled] = useState(true);

  const loadEndpoints = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/webhooks")
      .then((res) => res.json())
      .then((data) => {
        setEndpoints(data.endpoints || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load webhooks");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadEndpoints();
  }, [loadEndpoints]);

  async function loadDeliveries(endpointId: number) {
    if (expandedId === endpointId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(endpointId);
    setDeliveriesLoading(true);
    try {
      const res = await fetch(`/api/admin/webhooks?endpointId=${endpointId}`);
      const data = await res.json();
      setDeliveries(data.deliveries || []);
    } catch {
      toast.error("Failed to load deliveries");
    } finally {
      setDeliveriesLoading(false);
    }
  }

  function openNewDialog() {
    setEditingEndpoint(null);
    setFormUrl("");
    setFormDescription("");
    setFormEvents([]);
    setFormEnabled(true);
    setCreatedSecret(null);
    setDialogOpen(true);
  }

  function openEditDialog(ep: WebhookEndpoint) {
    setEditingEndpoint(ep);
    setFormUrl(ep.url);
    setFormDescription(ep.description || "");
    setFormEvents(JSON.parse(ep.events));
    setFormEnabled(ep.enabled);
    setCreatedSecret(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formUrl.trim().startsWith("https://")) {
      toast.error("URL must start with https://");
      return;
    }
    if (formEvents.length === 0) {
      toast.error("Select at least one event type");
      return;
    }

    setSaving(true);
    try {
      if (editingEndpoint) {
        // PATCH existing
        const res = await fetch("/api/admin/webhooks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingEndpoint.id,
            url: formUrl.trim(),
            description: formDescription.trim() || null,
            events: formEvents,
            enabled: formEnabled,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Failed to update webhook");
        } else {
          toast.success("Webhook updated");
          setDialogOpen(false);
          loadEndpoints();
        }
      } else {
        // POST new
        const res = await fetch("/api/admin/webhooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: formUrl.trim(),
            description: formDescription.trim() || null,
            events: formEvents,
            enabled: formEnabled,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Failed to create webhook");
        } else {
          toast.success("Webhook created");
          setCreatedSecret(data.endpoint?.secret || null);
          if (!data.endpoint?.secret) {
            setDialogOpen(false);
          }
          loadEndpoints();
        }
      }
    } catch {
      toast.error("Failed to save webhook");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(ep: WebhookEndpoint) {
    try {
      const res = await fetch("/api/admin/webhooks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ep.id, enabled: !ep.enabled }),
      });
      if (!res.ok) {
        toast.error("Failed to toggle webhook");
      } else {
        loadEndpoints();
      }
    } catch {
      toast.error("Failed to toggle webhook");
    }
  }

  async function handleDelete() {
    if (!deletingEndpoint) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/webhooks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletingEndpoint.id }),
      });
      if (!res.ok) {
        toast.error("Failed to delete webhook");
      } else {
        toast.success("Webhook deleted");
        setDeleteDialogOpen(false);
        setDeletingEndpoint(null);
        if (expandedId === deletingEndpoint.id) setExpandedId(null);
        loadEndpoints();
      }
    } catch {
      toast.error("Failed to delete webhook");
    } finally {
      setSaving(false);
    }
  }

  function toggleEvent(event: string) {
    setFormEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  function formatTimestamp(ts: string | null) {
    if (!ts) return "-";
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard"));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Send real-time event notifications to external systems.
          </p>
        </div>
        <Button size="sm" onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-1" />
          New Webhook
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading webhooks...
          </div>
        ) : endpoints.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No webhooks configured. Click &quot;New Webhook&quot; to create one.
          </p>
        ) : (
          <div className="space-y-3">
            {endpoints.map((ep) => {
              const events: string[] = (() => {
                try { return JSON.parse(ep.events); } catch { return []; }
              })();
              const isExpanded = expandedId === ep.id;

              return (
                <div key={ep.id} className="rounded-md border">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => loadDeliveries(ep.id)}
                            className="flex items-center gap-1 text-sm font-medium hover:underline"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0" />
                            )}
                            <span className="font-mono text-xs truncate">{ep.url}</span>
                          </button>
                          <Switch
                            checked={ep.enabled}
                            onCheckedChange={() => handleToggle(ep)}
                          />
                        </div>
                        {ep.description && (
                          <p className="text-xs text-muted-foreground mt-1 ml-5">
                            {ep.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2 ml-5">
                          {events.map((ev) => (
                            <Badge key={ev} variant="outline" className="text-xs">
                              {ev}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 mt-2 ml-5 text-xs text-muted-foreground">
                          {ep.failureCount > 0 && (
                            <span className="text-destructive flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              {ep.failureCount} failures
                            </span>
                          )}
                          {ep.lastSuccessAt && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Last success: {formatTimestamp(ep.lastSuccessAt)}
                            </span>
                          )}
                          {ep.lastFailureAt && (
                            <span className="flex items-center gap-1">
                              <XCircle className="h-3 w-3 text-destructive" />
                              Last failure: {formatTimestamp(ep.lastFailureAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(ep)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingEndpoint(ep);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Deliveries panel */}
                  {isExpanded && (
                    <div className="border-t bg-muted/30 p-4">
                      <p className="text-xs font-medium mb-2">Recent Deliveries</p>
                      {deliveriesLoading ? (
                        <div className="flex items-center gap-2 py-4 justify-center text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading...
                        </div>
                      ) : deliveries.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No deliveries yet.
                        </p>
                      ) : (
                        <div className="rounded-md border bg-background">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Event</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs">HTTP</TableHead>
                                <TableHead className="text-xs">Attempts</TableHead>
                                <TableHead className="text-xs">Time</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {deliveries.slice(0, 20).map((d) => (
                                <TableRow key={d.id}>
                                  <TableCell className="text-xs font-mono">
                                    {d.eventType}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        d.status === "delivered"
                                          ? "default"
                                          : d.status === "failed"
                                          ? "destructive"
                                          : "outline"
                                      }
                                      className="text-xs"
                                    >
                                      {d.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {d.httpStatus ?? "-"}
                                  </TableCell>
                                  <TableCell className="text-xs">{d.attempts}</TableCell>
                                  <TableCell className="text-xs">
                                    {formatTimestamp(d.createdAt)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* New / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) setCreatedSecret(null);
          setDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {createdSecret
                ? "Webhook Created"
                : editingEndpoint
                ? "Edit Webhook"
                : "New Webhook"}
            </DialogTitle>
            <DialogDescription>
              {createdSecret
                ? "Save the signing secret below. It will not be shown again."
                : editingEndpoint
                ? "Update the webhook endpoint configuration."
                : "Create a new webhook endpoint to receive event notifications."}
            </DialogDescription>
          </DialogHeader>

          {createdSecret ? (
            <div className="space-y-3">
              <Label>Signing Secret</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={createdSecret}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(createdSecret)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-destructive font-medium">
                Copy this secret now. It will not be shown again.
              </p>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setCreatedSecret(null);
                    setDialogOpen(false);
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">URL *</Label>
                  <Input
                    id="webhook-url"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://example.com/webhooks"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be a valid HTTPS URL.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-desc">Description</Label>
                  <Input
                    id="webhook-desc"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="What this webhook is for"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="webhook-enabled"
                    checked={formEnabled}
                    onCheckedChange={setFormEnabled}
                  />
                  <Label htmlFor="webhook-enabled">Enabled</Label>
                </div>
                <div className="space-y-2">
                  <Label>Event Types *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {EVENT_TYPES.map((event) => (
                      <label
                        key={event}
                        className="flex items-center gap-2 text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formEvents.includes(event)}
                          onChange={() => toggleEvent(event)}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="font-mono">{event}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !formUrl.trim() || formEvents.length === 0}
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  {editingEndpoint ? "Save Changes" : "Create Webhook"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Webhook</DialogTitle>
            <DialogDescription>
              Are you sure? This will delete the endpoint and all delivery history.
            </DialogDescription>
          </DialogHeader>
          {deletingEndpoint && (
            <p className="text-sm font-mono truncate">{deletingEndpoint.url}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
