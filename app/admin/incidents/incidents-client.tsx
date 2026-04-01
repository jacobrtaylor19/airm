"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Brain,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  Eye,
  Loader2,
} from "lucide-react";

// ── Types ──

interface AIClassification {
  category: string;
  rootCause: string;
  suggestedFix: string;
  confidence: number;
  blastRadius: string;
}

interface Incident {
  id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  source: string;
  sourceRef: string | null;
  aiClassification: AIClassification | null;
  aiTriagedAt: string | null;
  resolution: string | null;
  resolvedBy: number | null;
  resolvedByName?: string | null;
  resolvedAt: string | null;
  affectedComponent: string | null;
  affectedUsers: number | null;
  metadata: Record<string, unknown> | null;
  organizationId: number;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ──

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-red-100 text-red-800 border-red-200",
  investigating: "bg-yellow-100 text-yellow-800 border-yellow-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
  dismissed: "bg-gray-100 text-gray-600 border-gray-200",
};

const SOURCE_LABELS: Record<string, string> = {
  sentry: "Sentry",
  health_check: "Health Check",
  job_failure: "Job Failure",
  webhook_failure: "Webhook",
  manual: "Manual",
};

function Badge({ label, styles }: { label: string; styles: Record<string, string> }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        styles[label] ?? "bg-gray-100 text-gray-600 border-gray-200",
      )}
    >
      {label}
    </span>
  );
}

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color =
    confidence >= 80
      ? "text-green-700 bg-green-50"
      : confidence >= 50
        ? "text-yellow-700 bg-yellow-50"
        : "text-red-700 bg-red-50";
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", color)}>
      {confidence}% confidence
    </span>
  );
}

// ── Main Component ──

export function IncidentsClient() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterSeverity, setFilterSeverity] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [triagingId, setTriagingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  // Resolution form state (per expanded incident)
  const [editStatus, setEditStatus] = useState<string>("");
  const [editResolution, setEditResolution] = useState<string>("");

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterSeverity) params.set("severity", filterSeverity);
      const res = await fetch(`/api/admin/incidents?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setIncidents(data.incidents);
    } catch {
      toast.error("Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSeverity]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleExpand = (inc: Incident) => {
    if (expandedId === inc.id) {
      setExpandedId(null);
    } else {
      setExpandedId(inc.id);
      setEditStatus(inc.status);
      setEditResolution(inc.resolution ?? "");
    }
  };

  const handleRetriage = async (incidentId: number) => {
    setTriagingId(incidentId);
    try {
      const res = await fetch(`/api/admin/incidents/${incidentId}/retriage`, { method: "POST" });
      if (!res.ok) throw new Error("Retriage failed");
      const data = await res.json();
      if (data.incident) {
        setIncidents((prev) =>
          prev.map((i) => (i.id === incidentId ? { ...i, ...data.incident } : i)),
        );
      }
      toast.success("AI re-triage complete");
    } catch {
      toast.error("Failed to re-triage incident");
    } finally {
      setTriagingId(null);
    }
  };

  const handleSave = async (incidentId: number) => {
    setSavingId(incidentId);
    try {
      const res = await fetch(`/api/admin/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editStatus, resolution: editResolution || null }),
      });
      if (!res.ok) throw new Error("Save failed");
      // Refresh data
      await fetchIncidents();
      toast.success("Incident updated");
    } catch {
      toast.error("Failed to update incident");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
            <p className="text-sm text-gray-500">
              Automated detection, AI triage, and resolution tracking
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-3.5 w-3.5" /> Report Incident
          </button>
          <button
            onClick={fetchIncidents}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <CreateIncidentForm
          onCreated={() => {
            setShowCreateForm(false);
            fetchIncidents();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Search className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Filter:</span>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700"
        >
          <option value="">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <span className="text-xs text-gray-400">
          {incidents.length} incident{incidents.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Incidents Table */}
      {loading && incidents.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading incidents...
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-16 text-gray-400">
          <CheckCircle2 className="mb-2 h-8 w-8" />
          <p className="text-sm font-medium">No incidents found</p>
          <p className="text-xs">All systems are operating normally</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {/* Table header */}
          <div className="grid grid-cols-[32px_80px_1fr_100px_100px_110px_80px] gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <span />
            <span>Severity</span>
            <span>Title</span>
            <span>Source</span>
            <span>Status</span>
            <span>AI Triage</span>
            <span>When</span>
          </div>

          {/* Rows */}
          {incidents.map((inc) => (
            <div key={inc.id}>
              {/* Summary row */}
              <button
                onClick={() => handleExpand(inc)}
                className={cn(
                  "grid w-full grid-cols-[32px_80px_1fr_100px_100px_110px_80px] gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50",
                  expandedId === inc.id && "bg-gray-50",
                  inc.severity === "critical" && inc.status === "open" && "border-l-4 border-l-red-500",
                )}
              >
                <span className="flex items-center">
                  {expandedId === inc.id ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                </span>
                <span>
                  <Badge label={inc.severity} styles={SEVERITY_STYLES} />
                </span>
                <span className="truncate font-medium text-gray-900">{inc.title}</span>
                <span className="text-gray-500 text-xs">{SOURCE_LABELS[inc.source] ?? inc.source}</span>
                <span>
                  <Badge label={inc.status} styles={STATUS_STYLES} />
                </span>
                <span>
                  {inc.aiClassification ? (
                    <ConfidenceBadge confidence={inc.aiClassification.confidence} />
                  ) : inc.aiTriagedAt ? (
                    <span className="text-xs text-gray-400">No result</span>
                  ) : (
                    <span className="text-xs text-gray-400">Pending</span>
                  )}
                </span>
                <span className="text-xs text-gray-400">{timeAgo(inc.createdAt)}</span>
              </button>

              {/* Expanded detail */}
              {expandedId === inc.id && (
                <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-5">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Left: Details */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Description</h4>
                        <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{inc.description}</p>
                      </div>

                      {inc.affectedComponent && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Affected Component</h4>
                          <p className="mt-1 text-sm text-gray-700">{inc.affectedComponent}</p>
                        </div>
                      )}

                      {inc.sourceRef && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Source Reference</h4>
                          <p className="mt-1 text-sm font-mono text-gray-600">{inc.sourceRef}</p>
                        </div>
                      )}

                      {/* Timeline */}
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Timeline</h4>
                        <div className="space-y-2">
                          <TimelineItem
                            icon={<Clock className="h-3.5 w-3.5" />}
                            label="Created"
                            time={inc.createdAt}
                            active
                          />
                          {inc.aiTriagedAt && (
                            <TimelineItem
                              icon={<Brain className="h-3.5 w-3.5" />}
                              label="AI Triaged"
                              time={inc.aiTriagedAt}
                              active
                            />
                          )}
                          {inc.status === "investigating" && (
                            <TimelineItem
                              icon={<Eye className="h-3.5 w-3.5" />}
                              label="Investigating"
                              time={inc.updatedAt}
                              active
                            />
                          )}
                          {inc.resolvedAt && (
                            <TimelineItem
                              icon={
                                inc.status === "resolved" ? (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5" />
                                )
                              }
                              label={inc.status === "resolved" ? "Resolved" : "Dismissed"}
                              time={inc.resolvedAt}
                              active
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: AI Triage + Resolution Form */}
                    <div className="space-y-4">
                      {/* AI Triage Card */}
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                            <Brain className="h-4 w-4 text-teal-500" /> AI Triage
                          </h4>
                          <button
                            onClick={() => handleRetriage(inc.id)}
                            disabled={triagingId === inc.id}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <RefreshCw className={cn("h-3 w-3", triagingId === inc.id && "animate-spin")} />
                            Re-triage
                          </button>
                        </div>

                        {inc.aiClassification ? (
                          <div className="space-y-2.5 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Category</span>
                              <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 capitalize">
                                {inc.aiClassification.category}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Blast Radius</span>
                              <span className="text-xs font-medium text-gray-700 capitalize">
                                {inc.aiClassification.blastRadius}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Confidence</span>
                              <ConfidenceBadge confidence={inc.aiClassification.confidence} />
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-500">Root Cause</span>
                              <p className="mt-0.5 text-gray-700">{inc.aiClassification.rootCause}</p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-500">Suggested Fix</span>
                              <p className="mt-0.5 text-gray-700">{inc.aiClassification.suggestedFix}</p>
                            </div>
                          </div>
                        ) : triagingId === inc.id ? (
                          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                            <Loader2 className="h-4 w-4 animate-spin" /> Running AI triage...
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 py-2">
                            {inc.aiTriagedAt ? "Triage completed but no result was returned." : "AI triage is pending or not yet started."}
                          </p>
                        )}
                      </div>

                      {/* Resolution Form */}
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <h4 className="mb-3 text-sm font-semibold text-gray-900">Update Status</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                            >
                              <option value="open">Open</option>
                              <option value="investigating">Investigating</option>
                              <option value="resolved">Resolved</option>
                              <option value="dismissed">Dismissed</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Resolution Notes</label>
                            <textarea
                              value={editResolution}
                              onChange={(e) => setEditResolution(e.target.value)}
                              rows={3}
                              placeholder="Describe the resolution or reason for dismissal..."
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </div>
                          <button
                            onClick={() => handleSave(inc.id)}
                            disabled={savingId === inc.id}
                            className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                          >
                            {savingId === inc.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

function TimelineItem({
  icon,
  label,
  time,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  time: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", active ? "bg-teal-100 text-teal-600" : "bg-gray-100 text-gray-400")}>
        {icon}
      </span>
      <span className="font-medium text-gray-700">{label}</span>
      <span className="text-xs text-gray-400">{new Date(time).toLocaleString()}</span>
    </div>
  );
}

function CreateIncidentForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [affectedComponent, setAffectedComponent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          severity,
          affectedComponent: affectedComponent.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      toast.success("Incident reported");
      onCreated();
    } catch {
      toast.error("Failed to create incident");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
    >
      <h3 className="mb-4 text-sm font-semibold text-gray-900">Report New Incident</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief incident title"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe the issue, impact, and any immediate observations..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Severity</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Affected Component</label>
          <select
            value={affectedComponent}
            onChange={(e) => setAffectedComponent(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Not specified</option>
            <option value="ai_pipeline">AI Pipeline</option>
            <option value="auth">Authentication</option>
            <option value="database">Database</option>
            <option value="export">Export</option>
            <option value="integration">Integration</option>
            <option value="performance">Performance</option>
            <option value="security">Security</option>
            <option value="configuration">Configuration</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          Report Incident
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
