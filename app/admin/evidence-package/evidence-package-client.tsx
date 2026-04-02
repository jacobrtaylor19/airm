"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileSpreadsheet, Download, Clock } from "lucide-react";
import { toast } from "sonner";

interface Release {
  id: number;
  name: string;
  status: string;
}

interface PastRun {
  id: number;
  framework: string;
  releaseId: number | null;
  generatedByUsername: string;
  userCount: number;
  personaCount: number;
  assignmentCount: number;
  sodConflictCount: number;
  createdAt: string;
}

interface Props {
  releases: Release[];
  pastRuns: PastRun[];
}

export function EvidencePackageClient({ releases, pastRuns }: Props) {
  const [framework, setFramework] = useState("sox_404");
  const [releaseId, setReleaseId] = useState("all");
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      const body: Record<string, string> = { framework };
      if (releaseId !== "all") body.releaseId = releaseId;

      const res = await fetch("/api/admin/evidence-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Generation failed");
        return;
      }

      // Download the file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "")
        || `evidence_package_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Evidence package generated and downloading");
      // Refresh to show new run in history
      window.location.reload();
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Generator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-teal-600" />
            Generate Evidence Package
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Framework</label>
              <Select value={framework} onValueChange={setFramework}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sox_404">SOX 404 (ITGC)</SelectItem>
                  <SelectItem value="soc2_cc6">SOC 2 CC6</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Scope</label>
              <Select value={releaseId} onValueChange={setReleaseId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Releases (org-wide)</SelectItem>
                  {releases.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={generate} disabled={generating} className="gap-2 w-full">
                <Download className="h-4 w-4" />
                {generating ? "Generating..." : "Generate & Download"}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            The evidence package includes 5 sections: Control Summary, User Access Matrix,
            Persona Assignment Audit Trail, SOD Conflict Register, and Approval Audit Trail.
          </p>
        </CardContent>
      </Card>

      {/* Past Runs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Generation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pastRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No evidence packages have been generated yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Date</th>
                    <th className="pb-2 pr-3 font-medium">Framework</th>
                    <th className="pb-2 pr-3 font-medium">Generated By</th>
                    <th className="pb-2 pr-3 font-medium text-right">Users</th>
                    <th className="pb-2 pr-3 font-medium text-right">Personas</th>
                    <th className="pb-2 pr-3 font-medium text-right">Assignments</th>
                    <th className="pb-2 font-medium text-right">SOD Conflicts</th>
                  </tr>
                </thead>
                <tbody>
                  {pastRuns.map((run) => (
                    <tr key={run.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 pr-3">{new Date(run.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className="text-[10px]">
                          {run.framework === "sox_404" ? "SOX 404" : "SOC 2 CC6"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{run.generatedByUsername}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{run.userCount}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{run.personaCount}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{run.assignmentCount}</td>
                      <td className="py-2 text-right tabular-nums">{run.sodConflictCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
