"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Play, Zap } from "lucide-react";
import type { JobRow } from "@/lib/queries";
import { useRouter } from "next/navigation";

const jobTypes = [
  { type: "persona_generation", label: "Persona Generation", endpoint: "/api/ai/persona-generation", description: "Analyze users and generate security personas" },
  { type: "persona_assignment", label: "Persona Assignment", endpoint: "/api/ai/persona-assignment", description: "Re-assign users to existing personas" },
  { type: "target_role_mapping", label: "Target Role Mapping", endpoint: "/api/ai/target-role-mapping", description: "Map personas to target roles (least access)" },
  { type: "sod_analysis", label: "SOD Analysis", endpoint: "/api/sod/analyze", description: "Check for segregation of duties conflicts" },
];

const statusColors: Record<string, string> = {
  queued: "bg-zinc-100 text-zinc-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export function JobsClient({ initialJobs }: { initialJobs: JobRow[] }) {
  const [jobs] = useState(initialJobs);
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const router = useRouter();

  async function runJob(endpoint: string, type: string) {
    setRunningJob(type);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(`Job failed: ${data.error}`);
      }
    } catch (err) {
      alert(`Job failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setRunningJob(null);
      router.refresh();
    }
  }

  async function runFullPipeline() {
    setPipelineRunning(true);
    try {
      for (const job of jobTypes) {
        setRunningJob(job.type);
        const res = await fetch(job.endpoint, { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          alert(`Pipeline failed at ${job.label}: ${data.error}`);
          break;
        }
      }
    } catch (err) {
      alert(`Pipeline failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setRunningJob(null);
      setPipelineRunning(false);
      router.refresh();
    }
  }

  function formatDuration(started: string | null, completed: string | null): string {
    if (!started) return "—";
    const start = new Date(started).getTime();
    const end = completed ? new Date(completed).getTime() : Date.now();
    const seconds = Math.round((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }

  function formatTime(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  }

  return (
    <div className="space-y-6">
      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" /> Run Full Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Runs all 4 jobs in sequence: Generate Personas → Assign Users → Map Target Roles → SOD Analysis
            </p>
            <Button onClick={runFullPipeline} disabled={pipelineRunning || !!runningJob}>
              {pipelineRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Pipeline...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Full Pipeline
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Individual Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jobTypes.map((job) => (
                <div key={job.type} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{job.label}</p>
                    <p className="text-xs text-muted-foreground">{job.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runJob(job.endpoint, job.type)}
                    disabled={!!runningJob}
                  >
                    {runningJob === job.type ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job History</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No jobs have been run yet. Use the buttons above to start processing.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-xs">{job.id}</TableCell>
                    <TableCell className="text-sm">
                      {job.jobType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${statusColors[job.status] ?? ""}`}>
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {job.processed ?? 0}/{job.totalRecords ?? 0}
                      {(job.failed ?? 0) > 0 && (
                        <span className="text-red-600 ml-1">({job.failed} failed)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTime(job.startedAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDuration(job.startedAt, job.completedAt)}
                    </TableCell>
                    <TableCell className="text-xs text-red-600 max-w-[200px] truncate">
                      {job.errorLog ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
