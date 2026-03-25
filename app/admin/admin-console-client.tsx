"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Building2,
  Users,
  UserCog,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Save,
  Loader2,
  Settings,
  Cpu,
  GitBranch,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface OrgTreeNode {
  id: number;
  name: string;
  level: string;
  parentId: number | null;
  description: string | null;
  children: OrgTreeNode[];
  userCount: number;
  assignedMapper: string | null;
  assignedApprover: string | null;
}

interface OrgUnitFlat {
  id: number;
  name: string;
  level: string;
  parentId: number | null;
  description: string | null;
}

interface AppUserOption {
  id: number;
  displayName: string;
  role: string;
}

// ─────────────────────────────────────────────
// OrgTreeItem (editable)
// ─────────────────────────────────────────────

function OrgTreeItem({
  node,
  depth = 0,
  mappers,
  approvers,
  onEdit,
  onDelete,
  onAssign,
}: {
  node: OrgTreeNode;
  depth?: number;
  mappers: AppUserOption[];
  approvers: AppUserOption[];
  onEdit: (node: OrgTreeNode) => void;
  onDelete: (node: OrgTreeNode) => void;
  onAssign: (nodeId: number, mapperId: number | null, approverId: number | null) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [showAssign, setShowAssign] = useState(false);
  const [mapperId, setMapperId] = useState<string>("");
  const [approverId, setApproverId] = useState<string>("");
  const hasChildren = node.children.length > 0;

  const levelColors: Record<string, string> = {
    L1: "bg-blue-100 text-blue-800",
    L2: "bg-emerald-100 text-emerald-800",
    L3: "bg-amber-100 text-amber-800",
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted/50 group ${depth === 0 ? "border-b" : ""}`}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        <span
          className="cursor-pointer shrink-0"
          onClick={() => hasChildren && setExpanded(!expanded)}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="w-4" />
          )}
        </span>
        <Badge
          variant="secondary"
          className={`text-[10px] px-1.5 py-0 ${levelColors[node.level] || ""}`}
        >
          {node.level}
        </Badge>
        <span className="font-medium text-sm">{node.name}</span>
        {node.description && (
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            — {node.description}
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {node.userCount}
          </span>
          {node.assignedMapper && (
            <span className="flex items-center gap-1 text-blue-600">
              <UserCog className="h-3 w-3" />
              {node.assignedMapper}
            </span>
          )}
          {node.assignedApprover && (
            <span className="flex items-center gap-1 text-emerald-600">
              <UserCog className="h-3 w-3" />
              {node.assignedApprover}
            </span>
          )}
          <span className="hidden group-hover:flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                setShowAssign(!showAssign);
              }}
              title="Assign mapper/approver"
            >
              <UserCog className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(node);
              }}
              title="Edit"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node);
              }}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </span>
        </span>
      </div>

      {/* Inline assign mapper/approver */}
      {showAssign && (
        <div
          className="flex items-center gap-2 py-2 px-4 bg-muted/20 border-b"
          style={{ paddingLeft: `${depth * 24 + 40}px` }}
        >
          <Label className="text-xs whitespace-nowrap">Mapper:</Label>
          <Select value={mapperId} onValueChange={setMapperId}>
            <SelectTrigger className="h-7 text-xs w-40">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {mappers.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label className="text-xs whitespace-nowrap ml-2">Approver:</Label>
          <Select value={approverId} onValueChange={setApproverId}>
            <SelectTrigger className="h-7 text-xs w-40">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {approvers.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => {
              onAssign(
                node.id,
                mapperId && mapperId !== "__none__" ? Number(mapperId) : null,
                approverId && approverId !== "__none__" ? Number(approverId) : null
              );
              setShowAssign(false);
            }}
          >
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
        </div>
      )}

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <OrgTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              mappers={mappers}
              approvers={approvers}
              onEdit={onEdit}
              onDelete={onDelete}
              onAssign={onAssign}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main AdminConsoleClient
// ─────────────────────────────────────────────

export function AdminConsoleClient({ currentUser }: { currentUser: string }) {
  // ── Org hierarchy state ──
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

  // ── Settings state ──
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");

  // ── Load org hierarchy ──
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

  // ── Load settings ──
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

  // ── Org hierarchy handlers ──

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

  // ── Potential parents for a given level ──
  function getParentOptions(level: string): OrgUnitFlat[] {
    if (level === "L2") return allUnits.filter((u) => u.level === "L1");
    if (level === "L3") return allUnits.filter((u) => u.level === "L2");
    return [];
  }

  // ── Settings handlers ──

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

  // ── AI provider options ──
  const aiProviders = [
    { value: "anthropic", label: "Claude (Anthropic)" },
    { value: "azure_openai", label: "Azure OpenAI" },
    { value: "aws_bedrock", label: "AWS Bedrock" },
    { value: "ollama", label: "Ollama (Local)" },
    { value: "none", label: "None (Manual Only)" },
  ];

  const providerNeedsKey = (provider: string) =>
    ["anthropic", "azure_openai", "aws_bedrock"].includes(provider);

  const defaultModelForProvider = (provider: string) => {
    switch (provider) {
      case "anthropic":
        return "claude-sonnet-4-20250514";
      case "azure_openai":
        return "gpt-4o";
      case "aws_bedrock":
        return "anthropic.claude-sonnet-4-20250514-v1:0";
      case "ollama":
        return "llama3";
      default:
        return "";
    }
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

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
        </TabsList>

        {/* ── ORG HIERARCHY TAB ── */}
        <TabsContent value="org-hierarchy" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Organizational Hierarchy
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tree view of the org hierarchy (L1 / L2 / L3). Hover nodes to edit, delete, or assign mapper/approver.
                  </p>
                </div>
                <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Org Unit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading org hierarchy...</p>
              ) : orgTree.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No org hierarchy configured.</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => setAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add your first org unit
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border divide-y">
                  {/* Legend */}
                  <div className="flex gap-4 text-xs px-3 py-2 bg-muted/30">
                    <span className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-800">L1</Badge>
                      Division
                    </span>
                    <span className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-800">L2</Badge>
                      Department
                    </span>
                    <span className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800">L3</Badge>
                      Section
                    </span>
                    <span className="ml-auto flex items-center gap-3">
                      <span className="flex items-center gap-1 text-blue-600">
                        <UserCog className="h-3 w-3" /> Mapper
                      </span>
                      <span className="flex items-center gap-1 text-emerald-600">
                        <UserCog className="h-3 w-3" /> Approver
                      </span>
                    </span>
                  </div>
                  {orgTree.map((node) => (
                    <OrgTreeItem
                      key={node.id}
                      node={node}
                      mappers={mappers}
                      approvers={approvers}
                      onEdit={openEditDialog}
                      onDelete={openDeleteDialog}
                      onAssign={handleAssign}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PROJECT SETTINGS TAB ── */}
        <TabsContent value="project" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Project Settings</CardTitle>
              <p className="text-xs text-muted-foreground">
                Configure project identity displayed throughout the application. Logged in as <span className="font-medium">{currentUser}</span>.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {settingsLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="project-name">Project Name</Label>
                      <Input
                        id="project-name"
                        value={settings["project.name"] || ""}
                        onChange={(e) => updateSetting("project.name", e.target.value)}
                        placeholder="AIRM"
                      />
                      <p className="text-xs text-muted-foreground">Displayed in the sidebar header</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project-org">Organization Name</Label>
                      <Input
                        id="project-org"
                        value={settings["project.organization"] || ""}
                        onChange={(e) => updateSetting("project.organization", e.target.value)}
                        placeholder="Acme Corp"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="source-system">Source System Name</Label>
                      <Input
                        id="source-system"
                        value={settings["project.sourceSystem"] || ""}
                        onChange={(e) => updateSetting("project.sourceSystem", e.target.value)}
                        placeholder="SAP ECC"
                      />
                      <p className="text-xs text-muted-foreground">Shown on upload and mapping pages</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target-system">Target System Name</Label>
                      <Input
                        id="target-system"
                        value={settings["project.targetSystem"] || ""}
                        onChange={(e) => updateSetting("project.targetSystem", e.target.value)}
                        placeholder="S/4HANA"
                      />
                      <p className="text-xs text-muted-foreground">Shown on upload and mapping pages</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() =>
                        saveSettings([
                          "project.name",
                          "project.sourceSystem",
                          "project.targetSystem",
                          "project.organization",
                        ])
                      }
                      disabled={settingsSaving}
                    >
                      {settingsSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                      Save Project Settings
                    </Button>
                    {settingsMsg && <span className="text-xs text-emerald-600">{settingsMsg}</span>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AI CONFIGURATION TAB ── */}
        <TabsContent value="ai-config" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">AI Configuration</CardTitle>
              <p className="text-xs text-muted-foreground">Configure the AI provider used for persona generation and role mapping.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {settingsLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>AI Provider</Label>
                      <Select
                        value={settings["ai.provider"] || "anthropic"}
                        onValueChange={(v) => {
                          updateSetting("ai.provider", v);
                          if (!settings["ai.model"]) {
                            updateSetting("ai.model", defaultModelForProvider(v));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {aiProviders.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Input
                        value={settings["ai.model"] || ""}
                        onChange={(e) => updateSetting("ai.model", e.target.value)}
                        placeholder={defaultModelForProvider(settings["ai.provider"] || "anthropic")}
                      />
                    </div>
                    {providerNeedsKey(settings["ai.provider"] || "anthropic") && (
                      <div className="space-y-2 sm:col-span-2">
                        <Label>API Key</Label>
                        <Input
                          type="password"
                          value={settings["ai.apiKey"] || ""}
                          onChange={(e) => updateSetting("ai.apiKey", e.target.value)}
                          placeholder="sk-..."
                        />
                        <p className="text-xs text-muted-foreground">
                          Stored in the database. Overrides ANTHROPIC_API_KEY environment variable when set.
                        </p>
                      </div>
                    )}
                    <div className="space-y-2 sm:col-span-2">
                      <Label>
                        Confidence Threshold: {settings["ai.confidenceThreshold"] || "85"}%
                      </Label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Number(settings["ai.confidenceThreshold"] || "85")}
                        onChange={(e) => updateSetting("ai.confidenceThreshold", e.target.value)}
                        className="w-full accent-primary"
                      />
                      <p className="text-xs text-muted-foreground">
                        Assignments below this threshold will be flagged for manual review.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() =>
                        saveSettings(["ai.provider", "ai.apiKey", "ai.model", "ai.confidenceThreshold"])
                      }
                      disabled={settingsSaving}
                    >
                      {settingsSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                      Save AI Configuration
                    </Button>
                    {settingsMsg && <span className="text-xs text-emerald-600">{settingsMsg}</span>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── WORKFLOW SETTINGS TAB ── */}
        <TabsContent value="workflow" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Workflow Settings</CardTitle>
              <p className="text-xs text-muted-foreground">Configure approval and risk acceptance workflows.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <>
                  {/* Auto-approve */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="auto-approve"
                        checked={settings["workflow.autoApprove"] === "true"}
                        onChange={(e) =>
                          updateSetting("workflow.autoApprove", e.target.checked ? "true" : "false")
                        }
                        className="h-4 w-4 accent-primary"
                      />
                      <Label htmlFor="auto-approve">
                        Auto-approve mappings above confidence threshold
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-7">
                      When enabled, AI-generated mappings with confidence above the threshold will be automatically approved.
                    </p>
                  </div>

                  {/* Approval Mode */}
                  <div className="space-y-2">
                    <Label>Approval Mode</Label>
                    <Select
                      value={settings["workflow.approvalMode"] || "single"}
                      onValueChange={(v) => updateSetting("workflow.approvalMode", v)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Approval</SelectItem>
                        <SelectItem value="dual">Dual Approval</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Dual approval requires two separate approvers for each mapping.
                    </p>
                  </div>

                  {/* SOD Risk Acceptance */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">SOD Risk Acceptance by Severity</Label>
                    <div className="space-y-2 ml-1">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={false}
                          disabled
                          className="h-4 w-4"
                        />
                        <span className="text-sm text-muted-foreground">
                          Critical — <span className="text-destructive font-medium">Never allowed</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="sod-high"
                          checked={settings["workflow.sodHighRiskAcceptable"] !== "false"}
                          onChange={(e) =>
                            updateSetting(
                              "workflow.sodHighRiskAcceptable",
                              e.target.checked ? "true" : "false"
                            )
                          }
                          className="h-4 w-4 accent-primary"
                        />
                        <Label htmlFor="sod-high" className="font-normal">
                          High — Allow risk acceptance
                        </Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="sod-medium"
                          checked={settings["workflow.sodMediumRiskAcceptable"] !== "false"}
                          onChange={(e) =>
                            updateSetting(
                              "workflow.sodMediumRiskAcceptable",
                              e.target.checked ? "true" : "false"
                            )
                          }
                          className="h-4 w-4 accent-primary"
                        />
                        <Label htmlFor="sod-medium" className="font-normal">
                          Medium — Allow risk acceptance
                        </Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="sod-low"
                          checked={settings["workflow.sodLowRiskAcceptable"] !== "false"}
                          onChange={(e) =>
                            updateSetting(
                              "workflow.sodLowRiskAcceptable",
                              e.target.checked ? "true" : "false"
                            )
                          }
                          className="h-4 w-4 accent-primary"
                        />
                        <Label htmlFor="sod-low" className="font-normal">
                          Low — Allow risk acceptance
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Least Access Threshold */}
                  <div className="space-y-2">
                    <Label>Least Access Excess Threshold (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        className="w-24 h-8 text-sm"
                        value={settings["least_access_threshold"] ?? "30"}
                        onChange={(e) => updateSetting("least_access_threshold", e.target.value)}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Persona-to-role mappings where excess permissions exceed this percentage will appear in Least Access analysis and trigger inline warnings in Role Mapping. Default: 30%.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() =>
                        saveSettings([
                          "workflow.autoApprove",
                          "workflow.approvalMode",
                          "workflow.sodCriticalRiskAcceptable",
                          "workflow.sodHighRiskAcceptable",
                          "workflow.sodMediumRiskAcceptable",
                          "workflow.sodLowRiskAcceptable",
                          "least_access_threshold",
                        ])
                      }
                      disabled={settingsSaving}
                    >
                      {settingsSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                      Save Workflow Settings
                    </Button>
                    {settingsMsg && <span className="text-xs text-emerald-600">{settingsMsg}</span>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── ADD ORG UNIT DIALOG ── */}
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

      {/* ── EDIT ORG UNIT DIALOG ── */}
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

      {/* ── DELETE ORG UNIT DIALOG ── */}
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
