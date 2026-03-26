"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Sparkles,
  Users,
  Loader2,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { BulkDeleteBar } from "@/components/shared/bulk-delete-bar";
import type { PersonaRow, GroupRow } from "@/lib/queries";

const groupColumns: Column<GroupRow & Record<string, unknown>>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "description", header: "Description" },
  {
    key: "accessLevel",
    header: "Access Level",
    sortable: true,
    render: (row) => (row as GroupRow).accessLevel ?? "\u2014",
  },
  {
    key: "domain",
    header: "Domain",
    sortable: true,
    render: (row) => (row as GroupRow).domain ?? "\u2014",
  },
  {
    key: "personaCount",
    header: "Personas",
    sortable: true,
    className: "text-right",
  },
  {
    key: "userCount",
    header: "Users",
    sortable: true,
    className: "text-right",
  },
];

export function PersonasPageClient({
  personas,
  groups,
  isAdmin = false,
}: {
  personas: PersonaRow[];
  groups: GroupRow[];
  isAdmin?: boolean;
}) {
  const router = useRouter();

  // Expandable list state
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [functionFilter, setFunctionFilter] = useState<string>("all");

  // Generate personas state
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState<{ processed: number; total: number } | null>(null);

  // Extract unique business functions for filter dropdown
  const businessFunctions = Array.from(
    new Set(personas.map((p) => p.businessFunction).filter((f): f is string => !!f))
  ).sort();

  // Filter personas by search and business function
  const filteredPersonas = personas.filter((p) => {
    // Business function filter
    if (functionFilter !== "all" && p.businessFunction !== functionFilter) return false;
    // Search filter
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.businessFunction || "").toLowerCase().includes(q) ||
      (p.groupName || "").toLowerCase().includes(q)
    );
  });

  function toggleRow(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = filteredPersonas.length > 0 && filteredPersonas.every((p) => selectedIds.has(p.id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPersonas.map((p) => p.id)));
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    const res = await fetch("/api/admin/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType: "personas", ids }),
    });
    if (res.ok) {
      toast.success(`Deleted ${ids.length} persona(s)`);
      setSelectedIds(new Set());
      router.refresh();
    } else {
      toast.error("Delete failed");
    }
  }

  async function handleGeneratePersonas() {
    setGenerating(true);
    setGenProgress(null);
    try {
      const res = await fetch("/api/ai/persona-generation", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Persona generation failed");
        return;
      }

      // Start progress polling
      if (data.jobId) {
        const pollTimer = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/jobs/${data.jobId}`);
            if (statusRes.ok) {
              const status = await statusRes.json();
              setGenProgress({
                processed: status.processed || 0,
                total: status.totalRecords || 0,
              });
              if (status.status === "completed" || status.status === "failed") {
                clearInterval(pollTimer);
              }
            }
          } catch { /* ignore */ }
        }, 1500);
      }

      toast.success(`Generated ${data.personasCreated} personas, assigned ${data.usersAssigned} users`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
      setGenProgress(null);
      router.refresh();
    }
  }

  // ── Empty state: no personas yet ──
  if (personas.length === 0 && !generating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="h-12 w-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-1">No personas generated yet</h3>
        <p className="text-sm text-slate-500 mb-6 max-w-md">
          Analyze your user population to generate security personas using AI.
          Personas group users with similar access patterns for efficient role mapping.
        </p>
        <Button
          onClick={handleGeneratePersonas}
          disabled={generating}
          className="bg-teal-500 hover:bg-teal-600 text-white"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Personas
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Generating progress overlay */}
      {generating && (
        <div className="rounded-lg border bg-slate-50 p-4 mb-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">Generating personas...</p>
            {genProgress && genProgress.total > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden max-w-[300px]">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((genProgress.processed / genProgress.total) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500">{genProgress.processed}/{genProgress.total}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <Tabs defaultValue="personas">
        <TabsList>
          <TabsTrigger value="personas">Personas ({personas.length})</TabsTrigger>
          <TabsTrigger value="groups">Consolidated Groups ({groups.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="personas" className="mt-4">
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search personas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={functionFilter}
              onChange={(e) => setFunctionFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Functions ({personas.length})</option>
              {businessFunctions.map((fn) => (
                <option key={fn} value={fn}>
                  {fn} ({personas.filter((p) => p.businessFunction === fn).length})
                </option>
              ))}
            </select>
            <Button
              onClick={handleGeneratePersonas}
              disabled={generating}
              className="bg-teal-500 hover:bg-teal-600 text-white"
              size="sm"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {personas.length > 0 ? "Regenerate Personas" : "Generate Personas"}
            </Button>
          </div>

          {/* Bulk action bar */}
          {isAdmin && selectedIds.size > 0 && (
            <BulkDeleteBar
              selectedCount={selectedIds.size}
              entityLabel="personas"
              onDelete={handleBulkDelete}
              onClear={() => setSelectedIds(new Set())}
            />
          )}

          {/* Expandable table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  {isAdmin && (
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-10" />
                  <TableHead>Name</TableHead>
                  <TableHead>Business Function</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPersonas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "No personas match your search." : "No personas generated yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPersonas.map((persona) => {
                    const isExpanded = expanded.has(persona.id);
                    const isSelected = selectedIds.has(persona.id);

                    return (
                      <PersonaExpandableRow
                        key={persona.id}
                        persona={persona}
                        isExpanded={isExpanded}
                        isSelected={isSelected}
                        isAdmin={isAdmin}
                        onToggleExpand={() => toggleRow(persona.id)}
                        onToggleSelect={() => toggleSelect(persona.id)}
                        onNavigate={() => router.push(`/personas/${persona.id}`)}
                      />
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="mt-4">
          <DataTable
            data={groups as (GroupRow & Record<string, unknown>)[]}
            columns={groupColumns}
            searchKey="name"
            searchPlaceholder="Search groups..."
            emptyMessage="No consolidated groups found."
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

// ── Expandable Persona Row ──
function PersonaExpandableRow({
  persona,
  isExpanded,
  isSelected,
  isAdmin,
  onToggleExpand,
  onToggleSelect,
  onNavigate,
}: {
  persona: PersonaRow;
  isExpanded: boolean;
  isSelected: boolean;
  isAdmin: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onNavigate: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete persona "${persona.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "personas", ids: [persona.id] }),
      });
      if (res.ok) {
        toast.success(`Deleted "${persona.name}"`);
        router.refresh();
      } else {
        toast.error("Delete failed");
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <TableRow className={`hover:bg-muted/50 ${isSelected ? "bg-indigo-50" : ""}`}>
        {isAdmin && (
          <TableCell>
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={isSelected}
              onChange={onToggleSelect}
            />
          </TableCell>
        )}
        <TableCell>
          <button onClick={onToggleExpand} className="p-1 hover:bg-slate-100 rounded">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-500" />
            )}
          </button>
        </TableCell>
        <TableCell className="font-medium">{persona.name}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{persona.businessFunction ?? "\u2014"}</TableCell>
        <TableCell>
          {persona.groupName ? (
            <Badge variant="outline" className="text-xs">{persona.groupName}</Badge>
          ) : (
            <span className="text-muted-foreground">\u2014</span>
          )}
        </TableCell>
        <TableCell className="text-right">{persona.userCount}</TableCell>
        <TableCell>
          <Badge variant="outline" className={`text-xs ${persona.source === "ai" ? "border-teal-200 bg-teal-50 text-teal-700" : ""}`}>
            {persona.source === "ai" ? "AI" : persona.source === "manual_upload" ? "Upload" : "Manual"}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onNavigate}>
              <ExternalLink className="h-3 w-3 mr-1" /> Detail
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded detail */}
      {isExpanded && (
        <TableRow className="bg-slate-50/50">
          <TableCell colSpan={isAdmin ? 8 : 7} className="py-4 px-6">
            <div className="space-y-3">
              {persona.description && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</h4>
                  <p className="text-sm text-slate-700">{persona.description}</p>
                </div>
              )}
              <div className="flex gap-6">
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Business Function</h4>
                  <p className="text-sm">{persona.businessFunction || "Not specified"}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Consolidated Group</h4>
                  <p className="text-sm">{persona.groupName || "Unassigned"}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Users Assigned</h4>
                  <p className="text-sm">{persona.userCount}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Source</h4>
                  <p className="text-sm">{persona.source === "ai" ? "AI-Generated" : persona.source === "manual_upload" ? "Uploaded" : "Manual"}</p>
                </div>
              </div>
              <div className="pt-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={onNavigate}>
                  View full detail →
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
