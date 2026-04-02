"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { TargetRoleRow, TargetPermissionInfo } from "@/lib/queries";

interface Props {
  role: TargetRoleRow;
  permissions: TargetPermissionInfo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  userRole: string;
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  draft: "bg-amber-100 text-amber-700 border-amber-200",
  archived: "bg-gray-100 text-gray-500 border-gray-200",
};

const sourceLabels: Record<string, string> = {
  uploaded: "Uploaded",
  ai_generated: "AI Generated",
  manual: "Manual",
};

export function RoleEditDialog({ role, permissions, open, onOpenChange, onSaved, userRole }: Props) {
  const [name, setName] = useState(role.roleName);
  const [description, setDescription] = useState(role.description ?? "");
  const [saving, setSaving] = useState(false);
  const canApprove = ["security_architect", "admin", "system_admin"].includes(userRole);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/target-roles/${role.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleName: name, description }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
        return;
      }
      toast.success("Role updated");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    setSaving(true);
    try {
      const res = await fetch(`/api/target-roles/${role.id}/approve`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to approve");
        return;
      }
      toast.success(`${role.roleName} approved and now available for mapping`);
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Failed to approve");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    setSaving(true);
    try {
      const res = await fetch(`/api/target-roles/${role.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to archive");
        return;
      }
      toast.success("Role archived");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Failed to archive");
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore() {
    setSaving(true);
    try {
      const res = await fetch(`/api/target-roles/${role.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to restore");
        return;
      }
      toast.success("Role restored to active");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Failed to restore");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Target Role
            <Badge variant="outline" className={statusColors[role.status] ?? ""}>
              {role.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {sourceLabels[role.source] ?? role.source}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Role ID</label>
            <p className="text-sm font-mono text-muted-foreground">{role.roleId}</p>
          </div>

          {role.status === "archived" ? (
            <>
              <div>
                <label className="text-sm font-medium">Name</label>
                <p className="text-sm text-muted-foreground">{role.roleName}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-muted-foreground">{role.description ?? "No description"}</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm min-h-[60px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <label className="text-sm font-medium">Permissions ({permissions.length})</label>
            {permissions.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1 max-h-[120px] overflow-y-auto">
                {permissions.map((p) => (
                  <Badge key={p.id} variant="outline" className="text-xs font-mono">
                    {p.permissionId}
                    {p.riskLevel && (
                      <span className={`ml-1 ${p.riskLevel === "high" ? "text-red-600" : p.riskLevel === "medium" ? "text-yellow-600" : "text-green-600"}`}>
                        ({p.riskLevel})
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">No permissions assigned</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {role.status === "draft" && canApprove && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Keep as Draft
              </Button>
              <Button onClick={handleApprove} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-1.5" />Approve Role</>}
              </Button>
            </>
          )}
          {role.status === "active" && (
            <>
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleArchive} disabled={saving}>
                <Archive className="h-4 w-4 mr-1.5" />Archive
              </Button>
              <Button onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
            </>
          )}
          {role.status === "archived" && canApprove && (
            <Button onClick={handleRestore} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RotateCcw className="h-4 w-4 mr-1.5" />Restore to Active</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
