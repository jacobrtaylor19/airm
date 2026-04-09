"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// DataTable removed — groups now use custom expandable table
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
  Plus,
} from "lucide-react";
import { BulkDeleteBar } from "@/components/shared/bulk-delete-bar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";
import type { PersonaRow, GroupRow } from "@/lib/queries";


const canExecuteJobs = (role: string) => ["system_admin", "admin", "mapper"].includes(role);

export function PersonasPageClient({
  personas,
  groups,
  userRole = "viewer",
  isDemo = false,
}: {
  personas: PersonaRow[];
  groups: GroupRow[];
  userRole?: string;
  isDemo?: boolean;
}) {
  const router = useRouter();
  const isAdminRole = ["system_admin", "admin", "mapper", "coordinator"].includes(userRole);

  // Expandable list state
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [functionFilter, setFunctionFilter] = useState<string>("all");

  // Generate personas state
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState<{ processed: number; total: number } | null>(null);
  const [showAiConfirm, setShowAiConfirm] = useState(false);
  const [showAddPersona, setShowAddPersona] = useState(false);
  const [addingPersona, setAddingPersona] = useState(false);

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

  function onGenerateClick() {
    if (isDemo) {
      setShowAiConfirm(true);
    } else {
      handleGeneratePersonas();
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
        setGenerating(false);
        return;
      }

      if (!data.jobId) {
        toast.error("No job ID returned");
        setGenerating(false);
        return;
      }

      // Poll for job completion
      const pollTimer = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/jobs/${data.jobId}`);
          if (!statusRes.ok) return;
          const status = await statusRes.json();

          setGenProgress({
            processed: status.processed || 0,
            total: status.totalRecords || 0,
          });

          if (status.status === "completed") {
            clearInterval(pollTimer);
            const created = status.totalRecords || 0;
            toast.success(`Persona generation complete — ${created} users processed`);
            setGenerating(false);
            setGenProgress(null);
            router.refresh();
          } else if (status.status === "failed") {
            clearInterval(pollTimer);
            toast.error(status.errorLog || "Persona generation failed");
            setGenerating(false);
            setGenProgress(null);
          }
        } catch { /* ignore polling errors */ }
      }, 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
      setGenerating(false);
      setGenProgress(null);
    }
  }

  const aiConfirmDialog = (
    <AlertDialog open={showAiConfirm} onOpenChange={setShowAiConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-teal-600" />
            AI Persona Generation
          </AlertDialogTitle>
          <AlertDialogDescription>
            This operation uses AI to analyze your user population and may take up to <strong className="text-foreground">3 minutes</strong> to complete. You can navigate away and check back &mdash; progress is tracked on the Processing Jobs page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-teal-600 hover:bg-teal-700"
            onClick={() => {
              setShowAiConfirm(false);
              handleGeneratePersonas();
            }}
          >
            Start Generation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // ── Empty state: no personas yet ──
  if (personas.length === 0 && !generating) {
    return (
      <>
        {aiConfirmDialog}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No personas generated yet</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md">
            Analyze your user population to generate security personas using AI.
            Personas group users with similar access patterns for efficient role mapping.
          </p>
          {canExecuteJobs(userRole) ? (
            <Button
              onClick={onGenerateClick}
              disabled={generating}
              className="bg-teal-500 hover:bg-teal-600 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Personas
            </Button>
          ) : (
            <p className="text-sm text-slate-400">Waiting for personas to be generated by a mapper or admin.</p>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {aiConfirmDialog}

      {/* Add Persona Dialog */}
      <AlertDialog open={showAddPersona} onOpenChange={setShowAddPersona}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Persona Manually</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new security persona. You can assign users and map target roles after creation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setAddingPersona(true);
              const form = e.currentTarget;
              const name = (form.elements.namedItem("personaName") as HTMLInputElement).value.trim();
              const businessFunction = (form.elements.namedItem("businessFunction") as HTMLInputElement).value.trim();
              const description = (form.elements.namedItem("description") as HTMLTextAreaElement).value.trim();
              if (!name) { setAddingPersona(false); return; }
              try {
                const res = await fetch("/api/personas/create", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name, businessFunction: businessFunction || null, description: description || null }),
                });
                if (!res.ok) {
                  const data = await res.json();
                  toast.error(data.error || "Failed to create persona");
                } else {
                  toast.success(`Persona "${name}" created`);
                  setShowAddPersona(false);
                  router.refresh();
                }
              } catch {
                toast.error("Failed to create persona");
              } finally {
                setAddingPersona(false);
              }
            }}
            className="space-y-3 mt-2"
          >
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input name="personaName" placeholder="e.g. Financial Controller" required className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Business Function</label>
              <Input name="businessFunction" placeholder="e.g. Finance" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                name="description"
                placeholder="Describe the persona's role and access requirements..."
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <Button type="submit" disabled={addingPersona} className="bg-teal-600 hover:bg-teal-700">
                {addingPersona ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Persona"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

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
            {canExecuteJobs(userRole) && (
              <Button
                onClick={onGenerateClick}
                disabled={generating}
                className="bg-teal-500 hover:bg-teal-600 text-white"
                size="sm"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {personas.length > 0 ? "Regenerate Personas" : "Generate Personas"}
              </Button>
            )}
            {["system_admin", "admin", "mapper", "coordinator"].includes(userRole) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddPersona(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Persona
              </Button>
            )}
          </div>

          {/* Bulk action bar */}
          {isAdminRole && selectedIds.size > 0 && (
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
                  {isAdminRole && (
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
                    <TableCell colSpan={isAdminRole ? 8 : 7} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "No personas match your search." : "No personas generated yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPersonas.map((persona, idx) => {
                    const isExpanded = expanded.has(persona.id);
                    const isSelected = selectedIds.has(persona.id);
                    const prevFunction = idx > 0 ? filteredPersonas[idx - 1].businessFunction : null;
                    const showDivider = idx > 0 && persona.businessFunction !== prevFunction;

                    return (
                      <React.Fragment key={persona.id}>
                        {showDivider && (
                          <TableRow className="pointer-events-none">
                            <TableCell colSpan={isAdminRole ? 8 : 7} className="py-1 px-0">
                              <div className="border-t-2 border-slate-200" />
                            </TableCell>
                          </TableRow>
                        )}
                        <PersonaExpandableRow
                          persona={persona}
                          isExpanded={isExpanded}
                          isSelected={isSelected}
                          isAdminRole={isAdminRole}
                          onToggleExpand={() => toggleRow(persona.id)}
                          onToggleSelect={() => toggleSelect(persona.id)}
                          onNavigate={() => router.push(`/personas/${persona.id}`)}
                        />
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="mt-4">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No consolidated groups found.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Access Level</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead className="text-right">Personas</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((g) => (
                    <TableRow
                      key={g.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => router.push(`/personas/group/${g.id}`)}
                    >
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </TableCell>
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{g.description || "—"}</TableCell>
                      <TableCell>{g.accessLevel || "—"}</TableCell>
                      <TableCell>{g.domain || "—"}</TableCell>
                      <TableCell className="text-right">{g.personaCount}</TableCell>
                      <TableCell className="text-right">{g.userCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
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
  isAdminRole,
  onToggleExpand,
  onToggleSelect,
  onNavigate,
}: {
  persona: PersonaRow;
  isExpanded: boolean;
  isSelected: boolean;
  isAdminRole: boolean;
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
      <TableRow className={`hover:bg-muted/50 ${isSelected ? "bg-teal-50" : ""}`}>
        {isAdminRole && (
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
            <Badge variant="outline" className="text-xs">{persona.groupName.replace(/_/g, " ")}</Badge>
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
            {isAdminRole && (
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
          <TableCell colSpan={isAdminRole ? 8 : 7} className="py-4 px-6">
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
