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
import { Loader2, Plus, Pencil, Trash2, Flag } from "lucide-react";

// -----------------------------------------------
// Types
// -----------------------------------------------

interface FeatureFlag {
  id: number;
  key: string;
  description: string | null;
  enabled: boolean;
  enabledForRoles: string | null; // JSON string
  enabledForUsers: string | null; // JSON string
  percentage: number | null;
  metadata: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const ALL_ROLES = [
  "system_admin",
  "admin",
  "approver",
  "coordinator",
  "mapper",
  "viewer",
];

// -----------------------------------------------
// FeatureFlagsSection
// -----------------------------------------------

export function FeatureFlagsSection() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFlag, setDeletingFlag] = useState<FeatureFlag | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formKey, setFormKey] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);
  const [formRoles, setFormRoles] = useState<string[]>([]);
  const [formPercentage, setFormPercentage] = useState<number>(100);

  const loadFlags = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/feature-flags")
      .then((res) => res.json())
      .then((data) => {
        setFlags(data.flags || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load feature flags");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  function openNewDialog() {
    setEditingFlag(null);
    setFormKey("");
    setFormDescription("");
    setFormEnabled(true);
    setFormRoles([]);
    setFormPercentage(100);
    setDialogOpen(true);
  }

  function openEditDialog(flag: FeatureFlag) {
    setEditingFlag(flag);
    setFormKey(flag.key);
    setFormDescription(flag.description || "");
    setFormEnabled(flag.enabled);
    setFormRoles(flag.enabledForRoles ? JSON.parse(flag.enabledForRoles) : []);
    setFormPercentage(flag.percentage ?? 100);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formKey.trim()) {
      toast.error("Key is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: formKey.trim(),
          description: formDescription.trim() || null,
          enabled: formEnabled,
          enabledForRoles: formRoles.length > 0 ? formRoles : null,
          percentage: formPercentage < 100 ? formPercentage : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save flag");
      } else {
        toast.success(editingFlag ? "Flag updated" : "Flag created");
        setDialogOpen(false);
        loadFlags();
      }
    } catch {
      toast.error("Failed to save feature flag");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(flag: FeatureFlag) {
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: flag.key,
          description: flag.description,
          enabled: !flag.enabled,
          enabledForRoles: flag.enabledForRoles ? JSON.parse(flag.enabledForRoles) : null,
          percentage: flag.percentage,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to toggle flag");
      } else {
        loadFlags();
      }
    } catch {
      toast.error("Failed to toggle flag");
    }
  }

  async function handleDelete() {
    if (!deletingFlag) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: deletingFlag.key }),
      });
      if (!res.ok) {
        toast.error("Failed to delete flag");
      } else {
        toast.success("Flag deleted");
        setDeleteDialogOpen(false);
        setDeletingFlag(null);
        loadFlags();
      }
    } catch {
      toast.error("Failed to delete flag");
    } finally {
      setSaving(false);
    }
  }

  function toggleRole(role: string) {
    setFormRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Feature Flags
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Control feature rollout by flag, role, and percentage.
          </p>
        </div>
        <Button size="sm" onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-1" />
          New Flag
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading flags...
          </div>
        ) : flags.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No feature flags configured. Click &quot;New Flag&quot; to create one.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Enabled</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="text-center">Percentage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flags.map((flag) => {
                  const roles: string[] = flag.enabledForRoles
                    ? JSON.parse(flag.enabledForRoles)
                    : [];
                  return (
                    <TableRow key={flag.key}>
                      <TableCell className="font-mono text-xs">{flag.key}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {flag.description || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={flag.enabled}
                          onCheckedChange={() => handleToggle(flag)}
                        />
                      </TableCell>
                      <TableCell>
                        {roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {roles.map((r) => (
                              <Badge key={r} variant="outline" className="text-xs">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">All roles</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {flag.percentage !== null ? `${flag.percentage}%` : "100%"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(flag)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingFlag(flag);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* New / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFlag ? "Edit Flag" : "New Feature Flag"}</DialogTitle>
            <DialogDescription>
              {editingFlag
                ? "Update the feature flag configuration."
                : "Create a new feature flag to control feature rollout."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="flag-key">Key *</Label>
              <Input
                id="flag-key"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                placeholder="e.g. enable_bulk_mapping"
                disabled={!!editingFlag}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier (snake_case). Cannot be changed after creation.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="flag-desc">Description</Label>
              <Input
                id="flag-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What this flag controls"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="flag-enabled"
                checked={formEnabled}
                onCheckedChange={setFormEnabled}
              />
              <Label htmlFor="flag-enabled">Enabled</Label>
            </div>
            <div className="space-y-2">
              <Label>Restrict to Roles</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      formRoles.includes(role)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty for all roles. Click to toggle.
              </p>
            </div>
            <div className="space-y-2">
              <Label>
                Rollout Percentage: {formPercentage}%
              </Label>
              <input
                type="range"
                min={0}
                max={100}
                value={formPercentage}
                onChange={(e) => setFormPercentage(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                Gradually roll out to a percentage of eligible users.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formKey.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editingFlag ? "Save Changes" : "Create Flag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Feature Flag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this feature flag? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingFlag && (
            <p className="text-sm">
              Flag: <span className="font-mono font-medium">{deletingFlag.key}</span>
            </p>
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
