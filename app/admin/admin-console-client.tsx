"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Building2,
  Settings,
  Cpu,
  GitBranch,
  RotateCcw,
  Loader2,
  Flag,
  Webhook,
  CalendarClock,
} from "lucide-react";

import { OrgTreeSection } from "./org-tree-section";
import type { OrgTreeNode, AppUserOption } from "./org-tree-section";
import {
  ProjectSettingsSection,
  AIConfigSection,
  WorkflowSettingsSection,
  DemoResetCard,
} from "./settings-section";
import { FeatureFlagsSection } from "./feature-flags-section";
import { WebhooksSection } from "./webhooks-section";
import { ScheduledExportsSection } from "./scheduled-exports-section";

// -----------------------------------------------
// Types
// -----------------------------------------------

interface OrgUnitFlat {
  id: number;
  name: string;
  level: string;
  parentId: number | null;
  description: string | null;
}

// -----------------------------------------------
// Main AdminConsoleClient
// -----------------------------------------------

export function AdminConsoleClient({ currentUser }: { currentUser: string }) {
  // -- Org hierarchy state --
  const [orgTree, setOrgTree] = useState<OrgTreeNode[]>([]);
  const [allUnits, setAllUnits] = useState<OrgUnitFlat[]>([]);
  const [mappers, setMappers] = useState<AppUserOption[]>([]);
  const [approvers, setApprovers] = useState<AppUserOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add form
  const [addName, setAddName] = useState("");
  const [addLevel, setAddLevel] = useState("L1");
  const [addParent, setAddParent] = useState<string>("");
  const [addDesc, setAddDesc] = useState("");

  // Edit form
  const [editNode, setEditNode] = useState<OrgTreeNode | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editParent, setEditParent] = useState<string>("");

  // Delete form
  const [deleteNode, setDeleteNode] = useState<OrgTreeNode | null>(null);

  // -- Settings state --
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");

  // -- Load org hierarchy --
  const loadOrgHierarchy = useCallback(() => {
    setLoading(true);
    fetch("/api/org-hierarchy")
      .then((res) => res.json())
      .then((data) => {
        setOrgTree(data.tree || []);
        setAllUnits(data.allUnits || []);
        setMappers(data.mappers || []);
        setApprovers(data.approvers || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // -- Load settings --
  const loadSettings = useCallback(() => {
    setSettingsLoading(true);
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setSettings(data);
        setSettingsLoading(false);
      })
      .catch(() => setSettingsLoading(false));
  }, []);

  useEffect(() => {
    loadOrgHierarchy();
    loadSettings();
  }, [loadOrgHierarchy, loadSettings]);

  // -- Org hierarchy handlers --

  async function handleAddOrgUnit() {
    if (!addName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/org-hierarchy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          level: addLevel,
          parentId: addParent ? Number(addParent) : null,
          description: addDesc.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create org unit");
      } else {
        setAddDialogOpen(false);
        setAddName("");
        setAddLevel("L1");
        setAddParent("");
        setAddDesc("");
        loadOrgHierarchy();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error creating org unit");
    } finally {
      setSaving(false);
    }
  }

  function openEditDialog(node: OrgTreeNode) {
    setEditNode(node);
    setEditName(node.name);
    setEditDesc(node.description || "");
    setEditParent(node.parentId ? String(node.parentId) : "");
    setEditDialogOpen(true);
  }

  async function handleEditOrgUnit() {
    if (!editNode || !editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/org-hierarchy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editNode.id,
          name: editName.trim(),
          description: editDesc.trim() || null,
          parentId: editParent ? Number(editParent) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update org unit");
      } else {
        setEditDialogOpen(false);
        setEditNode(null);
        loadOrgHierarchy();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error updating org unit");
    } finally {
      setSaving(false);
    }
  }

  function openDeleteDialog(node: OrgTreeNode) {
    setDeleteNode(node);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteOrgUnit() {
    if (!deleteNode) return;
    setSaving(true);
    try {
      const res = await fetch("/api/org-hierarchy", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteNode.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete org unit");
      } else {
        if (data.warning) alert(data.warning);
        setDeleteDialogOpen(false);
        setDeleteNode(null);
        loadOrgHierarchy();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error deleting org unit");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(nodeId: number, mapperId: number | null, approverId: number | null) {
    try {
      const res = await fetch("/api/org-hierarchy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: nodeId,
          assignedMapperId: mapperId,
          assignedApproverId: approverId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to assign");
      }
      loadOrgHierarchy();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error assigning");
    }
  }

  // -- Potential parents for a given level --
  function getParentOptions(level: string): OrgUnitFlat[] {
    if (level === "L2") return allUnits.filter((u) => u.level === "L1");
    if (level === "L3") return allUnits.filter((u) => u.level === "L2");
    return [];
  }

  // -- Settings handlers --

  function updateSetting(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function saveSettings(keys: string[]) {
    setSettingsSaving(true);
    setSettingsMsg("");
    try {
      const payload: Record<string, string> = {};
      for (const k of keys) {
        if (settings[k] !== undefined) payload[k] = settings[k];
      }
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        setSettingsMsg(data.error || "Failed to save");
      } else {
        setSettingsMsg("Settings saved successfully.");
        setTimeout(() => setSettingsMsg(""), 3000);
      }
    } catch (err) {
      setSettingsMsg(err instanceof Error ? err.message : "Error saving");
    } finally {
      setSettingsSaving(false);
    }
  }

  // -----------------------------------------------
  // Render
  // -----------------------------------------------

  return (
    <>
      <Tabs defaultValue="org-hierarchy">
        <TabsList>
          <TabsTrigger value="org-hierarchy" className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4" />
            Org Hierarchy
          </TabsTrigger>
          <TabsTrigger value="project" className="flex items-center gap-1.5">
            <Settings className="h-4 w-4" />
            Project Settings
          </TabsTrigger>
          <TabsTrigger value="ai-config" className="flex items-center gap-1.5">
            <Cpu className="h-4 w-4" />
            AI Configuration
          </TabsTrigger>
          <TabsTrigger value="workflow" className="flex items-center gap-1.5">
            <GitBranch className="h-4 w-4" />
            Workflow Settings
          </TabsTrigger>
          <TabsTrigger value="demo" className="flex items-center gap-1.5">
            <RotateCcw className="h-4 w-4" />
            Demo
          </TabsTrigger>
          <TabsTrigger value="feature-flags" className="flex items-center gap-1.5">
            <Flag className="h-4 w-4" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-1.5">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="scheduled-exports" className="flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4" />
            Scheduled Exports
          </TabsTrigger>
        </TabsList>

        {/* -- ORG HIERARCHY TAB -- */}
        <TabsContent value="org-hierarchy" className="mt-4">
          <OrgTreeSection
            orgTree={orgTree}
            mappers={mappers}
            approvers={approvers}
            loading={loading}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            onAssign={handleAssign}
            onAddClick={() => setAddDialogOpen(true)}
          />
        </TabsContent>

        {/* -- PROJECT SETTINGS TAB -- */}
        <TabsContent value="project" className="mt-4">
          <ProjectSettingsSection
            settings={settings}
            settingsLoading={settingsLoading}
            settingsSaving={settingsSaving}
            settingsMsg={settingsMsg}
            currentUser={currentUser}
            onUpdateSetting={updateSetting}
            onSaveSettings={saveSettings}
          />
        </TabsContent>

        {/* -- AI CONFIGURATION TAB -- */}
        <TabsContent value="ai-config" className="mt-4">
          <AIConfigSection
            settings={settings}
            settingsLoading={settingsLoading}
            settingsSaving={settingsSaving}
            settingsMsg={settingsMsg}
            onUpdateSetting={updateSetting}
            onSaveSettings={saveSettings}
          />
        </TabsContent>

        {/* -- WORKFLOW SETTINGS TAB -- */}
        <TabsContent value="workflow" className="mt-4">
          <WorkflowSettingsSection
            settings={settings}
            settingsLoading={settingsLoading}
            settingsSaving={settingsSaving}
            settingsMsg={settingsMsg}
            onUpdateSetting={updateSetting}
            onSaveSettings={saveSettings}
          />
        </TabsContent>

        {/* -- DEMO TAB -- */}
        <TabsContent value="demo" className="mt-4">
          <DemoResetCard />
        </TabsContent>

        {/* -- FEATURE FLAGS TAB -- */}
        <TabsContent value="feature-flags" className="mt-4">
          <FeatureFlagsSection />
        </TabsContent>

        {/* -- WEBHOOKS TAB -- */}
        <TabsContent value="webhooks" className="mt-4">
          <WebhooksSection />
        </TabsContent>

        {/* -- SCHEDULED EXPORTS TAB -- */}
        <TabsContent value="scheduled-exports" className="mt-4">
          <ScheduledExportsSection />
        </TabsContent>
      </Tabs>

      {/* -- ADD ORG UNIT DIALOG -- */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Org Unit</DialogTitle>
            <DialogDescription>
              Create a new organizational unit in the hierarchy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g., Finance Division"
              />
            </div>
            <div className="space-y-2">
              <Label>Level *</Label>
              <Select
                value={addLevel}
                onValueChange={(v) => {
                  setAddLevel(v);
                  setAddParent("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L1">L1 — Division</SelectItem>
                  <SelectItem value="L2">L2 — Department</SelectItem>
                  <SelectItem value="L3">L3 — Section</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(addLevel === "L2" || addLevel === "L3") && (
              <div className="space-y-2">
                <Label>Parent *</Label>
                <Select value={addParent} onValueChange={setAddParent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getParentOptions(addLevel).map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name} ({u.level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={addDesc}
                onChange={(e) => setAddDesc(e.target.value)}
                placeholder="Optional description"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddOrgUnit} disabled={saving || !addName.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Add Org Unit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -- EDIT ORG UNIT DIALOG -- */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Org Unit</DialogTitle>
            <DialogDescription>
              Update the name, description, or parent of this org unit.
            </DialogDescription>
          </DialogHeader>
          {editNode && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                />
              </div>
              {(editNode.level === "L2" || editNode.level === "L3") && (
                <div className="space-y-2">
                  <Label>Parent</Label>
                  <Select value={editParent} onValueChange={setEditParent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getParentOptions(editNode.level).map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name} ({u.level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditOrgUnit} disabled={saving || !editName.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -- DELETE ORG UNIT DIALOG -- */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Org Unit</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this org unit?
            </DialogDescription>
          </DialogHeader>
          {deleteNode && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">{deleteNode.name}</span> ({deleteNode.level})
              </p>
              {deleteNode.children.length > 0 && (
                <p className="text-destructive">
                  This unit has {deleteNode.children.length} children. You must delete them first.
                </p>
              )}
              {deleteNode.userCount > 0 && (
                <p className="text-amber-600">
                  Warning: {deleteNode.userCount} users are assigned to this org unit or its children. They will be unassigned.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOrgUnit}
              disabled={saving || (deleteNode?.children.length ?? 0) > 0}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
