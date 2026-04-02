"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  AlertTriangle,
  Zap,
  CircleDot,
  Lightbulb,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
  Filter,
  Trash2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

type WorkstreamItem = {
  id: number;
  organizationId: number;
  releaseId: number | null;
  category: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  owner: string | null;
  proposedBy: number | null;
  proposedByName: string | null;
  approvedBy: number | null;
  approvedByName: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type Release = { id: number; name: string };

interface Props {
  items: WorkstreamItem[];
  releases: Release[];
  isApprover: boolean;
  isViewer: boolean;
  currentUserId: number;
  currentUserName: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  risk:     { label: "Risk",     color: "bg-red-100 text-red-700",    icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  action:   { label: "Action",   color: "bg-blue-100 text-blue-700",  icon: <Zap className="h-3.5 w-3.5" /> },
  issue:    { label: "Issue",    color: "bg-orange-100 text-orange-700", icon: <CircleDot className="h-3.5 w-3.5" /> },
  decision: { label: "Decision", color: "bg-purple-100 text-purple-700", icon: <Lightbulb className="h-3.5 w-3.5" /> },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  proposed:    { label: "Proposed",    color: "bg-zinc-100 text-zinc-700",      icon: <Clock className="h-3.5 w-3.5" /> },
  approved:    { label: "Approved",    color: "bg-teal-100 text-teal-700",      icon: <CheckCircle className="h-3.5 w-3.5" /> },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700",     icon: <ArrowRight className="h-3.5 w-3.5" /> },
  resolved:    { label: "Resolved",    color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  rejected:    { label: "Rejected",    color: "bg-red-100 text-red-700",        icon: <XCircle className="h-3.5 w-3.5" /> },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: "Critical", color: "bg-red-600 text-white" },
  high:     { label: "High",     color: "bg-orange-500 text-white" },
  medium:   { label: "Medium",   color: "bg-yellow-100 text-yellow-800" },
  low:      { label: "Low",      color: "bg-zinc-100 text-zinc-600" },
};

const EMPTY_FORM = {
  category: "action",
  title: "",
  description: "",
  priority: "medium",
  owner: "",
  releaseId: "",
  dueDate: "",
};

export function WorkstreamClient({ items, releases, isApprover, isViewer, currentUserId, currentUserName }: Props) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<WorkstreamItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showResolveDialog, setShowResolveDialog] = useState<WorkstreamItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  function openCreate() {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, owner: currentUserName });
    setShowDialog(true);
  }

  function openEdit(item: WorkstreamItem) {
    setEditItem(item);
    setForm({
      category: item.category,
      title: item.title,
      description: item.description ?? "",
      priority: item.priority,
      owner: item.owner ?? "",
      releaseId: item.releaseId ? String(item.releaseId) : "",
      dueDate: item.dueDate ?? "",
    });
    setShowDialog(true);
  }

  async function save() {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const method = editItem ? "PUT" : "POST";
      const payload = editItem
        ? { id: editItem.id, ...form, releaseId: form.releaseId ? parseInt(form.releaseId) : null }
        : { ...form, releaseId: form.releaseId ? parseInt(form.releaseId) : null };
      const res = await fetch("/api/workstream", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
      } else {
        toast.success(editItem ? "Item updated" : "Item proposed");
        setShowDialog(false);
        router.refresh();
      }
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(item: WorkstreamItem, status: string) {
    try {
      const res = await fetch("/api/workstream", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update");
      } else {
        toast.success(`Item ${status.replace("_", " ")}`);
        router.refresh();
      }
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function resolveItem() {
    if (!showResolveDialog) return;
    try {
      const res = await fetch("/api/workstream", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: showResolveDialog.id, status: "resolved", resolutionNotes }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to resolve");
      } else {
        toast.success("Item resolved");
        setShowResolveDialog(null);
        setResolutionNotes("");
        router.refresh();
      }
    } catch {
      toast.error("Failed to resolve item");
    }
  }

  async function deleteItem(item: WorkstreamItem) {
    if (!confirm(`Delete "${item.title}"?`)) return;
    try {
      const res = await fetch(`/api/workstream?id=${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Item deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete item");
    }
  }

  const filtered = items.filter((item) => {
    if (filterCategory !== "all" && item.category !== filterCategory) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    return true;
  });

  // Summary stats
  const statCounts = {
    total: items.length,
    proposed: items.filter((i) => i.status === "proposed").length,
    open: items.filter((i) => ["approved", "in_progress"].includes(i.status)).length,
    resolved: items.filter((i) => i.status === "resolved").length,
    overdue: items.filter((i) => i.dueDate && new Date(i.dueDate) < new Date() && !["resolved", "rejected"].includes(i.status)).length,
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Workstream Tracker</h1>
          <p className="text-sm text-brand-text-muted mt-0.5">
            Track risks, actions, issues, and decisions for the role mapping workstream.
          </p>
        </div>
        {!isViewer && (
          <Button onClick={openCreate} className="gap-2 bg-brand-accent hover:bg-brand-accent-dark">
            <Plus className="h-4 w-4" /> Propose Item
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: statCounts.total, color: "text-brand-text" },
          { label: "Awaiting Approval", value: statCounts.proposed, color: "text-zinc-600" },
          { label: "Open", value: statCounts.open, color: "text-blue-600" },
          { label: "Resolved", value: statCounts.resolved, color: "text-emerald-600" },
          { label: "Overdue", value: statCounts.overdue, color: statCounts.overdue > 0 ? "text-red-600" : "text-zinc-400" },
        ].map((s) => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-3 text-center">
              <div className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
              <div className="text-xs text-brand-text-muted">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-brand-text-muted" />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="risk">Risks</SelectItem>
            <SelectItem value="action">Actions</SelectItem>
            <SelectItem value="issue">Issues</SelectItem>
            <SelectItem value="decision">Decisions</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="proposed">Proposed</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        {(filterCategory !== "all" || filterStatus !== "all") && (
          <button
            onClick={() => { setFilterCategory("all"); setFilterStatus("all"); }}
            className="text-xs text-brand-accent hover:underline"
          >
            Clear filters
          </button>
        )}
        <span className="text-xs text-brand-text-muted ml-auto">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Items list */}
      {filtered.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center space-y-3">
            <Lightbulb className="h-8 w-8 text-brand-text-muted/40 mx-auto" />
            <p className="text-brand-text-muted">
              {items.length === 0
                ? "No workstream items yet. Propose a risk, action, issue, or decision to get started."
                : "No items match the current filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const catCfg = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.action;
            const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.proposed;
            const prioCfg = PRIORITY_CONFIG[item.priority] ?? PRIORITY_CONFIG.medium;
            const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && !["resolved", "rejected"].includes(item.status);
            const canEdit = isApprover || (item.proposedBy === currentUserId && item.status === "proposed");
            const releaseName = item.releaseId ? releases.find((r) => r.id === item.releaseId)?.name : null;

            return (
              <Card key={item.id} className={`glass-card transition-colors ${isOverdue ? "border-red-300" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Top row: category + priority + status */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${catCfg.color}`}>
                          {catCfg.icon}
                          {catCfg.label}
                        </span>
                        <Badge className={`text-[10px] px-1.5 ${prioCfg.color}`}>{prioCfg.label}</Badge>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>
                        {releaseName && (
                          <span className="text-[10px] text-brand-text-muted bg-brand-cream-warm rounded px-1.5 py-0.5">{releaseName}</span>
                        )}
                        {isOverdue && (
                          <Badge className="text-[10px] px-1.5 bg-red-600 text-white">Overdue</Badge>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-sm text-brand-text">{item.title}</h3>

                      {/* Description */}
                      {item.description && (
                        <p className="text-xs text-brand-text-muted mt-1 line-clamp-2">{item.description}</p>
                      )}

                      {/* Meta row */}
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-brand-text-muted">
                        {item.proposedByName && <span>Proposed by <strong className="text-brand-text">{item.proposedByName}</strong></span>}
                        {item.owner && <span>Owner: <strong className="text-brand-text">{item.owner}</strong></span>}
                        {item.dueDate && (
                          <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                            Due: {new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        )}
                        {item.approvedByName && (
                          <span>
                            {item.status === "rejected" ? "Rejected" : "Approved"} by <strong className="text-brand-text">{item.approvedByName}</strong>
                          </span>
                        )}
                      </div>

                      {/* Resolution notes */}
                      {item.status === "resolved" && item.resolutionNotes && (
                        <div className="mt-2 p-2 bg-emerald-50 rounded-lg text-xs text-emerald-800">
                          <strong>Resolution:</strong> {item.resolutionNotes}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex flex-col gap-1">
                      {/* Approve/Reject for proposed items */}
                      {isApprover && item.status === "proposed" && (
                        <>
                          <Button size="sm" className="h-7 text-xs gap-1 bg-brand-accent hover:bg-brand-accent-dark" onClick={() => updateStatus(item, "approved")}>
                            <CheckCircle className="h-3 w-3" /> Approve
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-red-600 hover:bg-red-50" onClick={() => updateStatus(item, "rejected")}>
                            <XCircle className="h-3 w-3" /> Reject
                          </Button>
                        </>
                      )}

                      {/* Progress actions for approved items */}
                      {item.status === "approved" && !isViewer && (
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => updateStatus(item, "in_progress")}>
                          <ArrowRight className="h-3 w-3" /> Start
                        </Button>
                      )}

                      {/* Resolve for in-progress items */}
                      {item.status === "in_progress" && !isViewer && (
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-emerald-600 hover:bg-emerald-50" onClick={() => { setShowResolveDialog(item); setResolutionNotes(""); }}>
                          <CheckCircle className="h-3 w-3" /> Resolve
                        </Button>
                      )}

                      {/* Edit */}
                      {canEdit && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openEdit(item)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}

                      {/* Delete (approvers only) */}
                      {isApprover && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-red-500 hover:text-red-700" onClick={() => deleteItem(item)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Item" : "Propose Workstream Item"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Category</label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="risk">Risk</SelectItem>
                    <SelectItem value="action">Action</SelectItem>
                    <SelectItem value="issue">Issue</SelectItem>
                    <SelectItem value="decision">Decision</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Priority</label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="e.g. Confirm SOD rule set with compliance team"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                placeholder="Additional context, background, or impact..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Owner</label>
                <Input
                  placeholder="Responsible person"
                  value={form.owner}
                  onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>

            {releases.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Linked Release (optional)</label>
                <Select value={form.releaseId} onValueChange={(v) => setForm((f) => ({ ...f, releaseId: v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {releases.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-brand-accent hover:bg-brand-accent-dark">
              {saving ? "Saving..." : editItem ? "Save Changes" : "Propose Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={!!showResolveDialog} onOpenChange={() => setShowResolveDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-brand-text-muted">
              Resolving: <strong>{showResolveDialog?.title}</strong>
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Resolution Notes</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                placeholder="How was this resolved? What was decided?"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(null)}>Cancel</Button>
            <Button onClick={resolveItem} className="bg-emerald-600 hover:bg-emerald-700">Resolve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
