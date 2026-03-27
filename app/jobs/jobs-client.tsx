"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2,
  Play,
  Sparkles,
  Upload,
  Users,
  Target,
  UserCheck,
  ShieldAlert,
  CheckCircle,
  CheckCircle2,
  Circle,
  XCircle,
  Link as LinkIcon,
  ChevronRight,
} from "lucide-react";
import type { JobRow } from "@/lib/queries";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PipelineStep {
  step: number;
  label: string;
  description: string;
  type: "link" | "action";
  href?: string;
  endpoint?: string;
  jobType?: string;
  icon: React.ElementType;
}

const pipelineSteps: PipelineStep[] = [
  {
    step: 1,
    label: "Upload Data",
    description: "Upload source users, roles, and permissions",
    type: "link",
    href: "/upload",
    icon: Upload,
  },
  {
    step: 2,
    label: "Generate Personas",
    description: "Analyze users and generate security personas",
    type: "action",
    endpoint: "/api/ai/persona-generation",
    jobType: "persona_generation",
    icon: Users,
  },
  {
    step: 3,
    label: "Assign Users to Personas",
    description: "Re-assign users to existing personas",
    type: "action",
    endpoint: "/api/ai/persona-assignment",
    jobType: "persona_assignment",
    icon: UserCheck,
  },
  {
    step: 4,
    label: "Map Personas to Target Roles",
    description: "Map personas to target roles (least access)",
    type: "action",
    endpoint: "/api/ai/target-role-mapping",
    jobType: "target_role_mapping",
    icon: Target,
  },
  {
    step: 5,
    label: "Create End User Mappings",
    description: "Generate individual user assignments from persona mappings",
    type: "action",
    endpoint: "/api/ai/end-user-mapping",
    jobType: "end_user_mapping",
    icon: LinkIcon,
  },
  {
    step: 6,
    label: "Run SOD Analysis",
    description: "Check for segregation of duties conflicts",
    type: "action",
    endpoint: "/api/sod/analyze",
    jobType: "sod_analysis",
    icon: ShieldAlert,
  },
  {
    step: 7,
    label: "Resolve Conflicts",
    description: "Review and resolve SOD conflicts",
    type: "link",
    href: "/sod",
    icon: ShieldAlert,
  },
  {
    step: 8,
    label: "Approve Mappings",
    description: "Review and approve user role assignments",
    type: "link",
    href: "/approvals",
    icon: CheckCircle,
  },
];

const statusColors: Record<string, string> = {
  queued: "bg-slate-100 text-slate-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export function JobsClient({ initialJobs, hasData, userRole = "viewer" }: { initialJobs: JobRow[]; hasData: boolean; userRole?: string }) {
  const [jobs] = useState(initialJobs);
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [jobProgress, setJobProgress] = useState<{ processed: number; total: number } | null>(null);
  const router = useRouter();

  // Determine last run per job type
  function getLastRun(jobType: string): JobRow | undefined {
    return jobs.find((j) => j.jobType === jobType);
  }

  function getStepStatus(step: PipelineStep): "pending" | "completed" | "failed" | "running" {
    if (step.type === "link") {
      if (step.step === 1) return hasData ? "completed" : "pending";
      return "pending";
    }
    if (runningJob === step.jobType) return "running";
    const lastRun = getLastRun(step.jobType!);
    if (!lastRun) return "pending";
    return lastRun.status as "completed" | "failed" | "pending";
  }

  function startProgressPolling(jobId: number): ReturnType<typeof setInterval> {
    return setInterval(async () => {
      try {
        const statusRes = await fetch(`/api/jobs/${jobId}`);
        if (statusRes.ok) {
          const status = await statusRes.json();
          setJobProgress({
            processed: status.processed || 0,
            total: status.totalRecords || 0,
          });
        }
      } catch { /* ignore polling errors */ }
    }, 1500);
  }

  async function runJob(endpoint: string, type: string) {
    setRunningJob(type);
    setJobProgress(null);
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(`Job failed: ${data.error}`);
      } else if (data.jobId) {
        pollTimer = startProgressPolling(data.jobId);
      }
    } catch (err) {
      alert(`Job failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      if (pollTimer) clearInterval(pollTimer);
      setRunningJob(null);
      setJobProgress(null);
      router.refresh();
    }
  }

  async function runFullPipeline() {
    setPipelineRunning(true);
    const actionSteps = pipelineSteps.filter((s) => s.type === "action");
    try {
      for (const step of actionSteps) {
        setRunningJob(step.jobType!);
        setJobProgress(null);

        const res = await fetch(step.endpoint!, { method: "POST" });
        const data = await res.json();

        if (!res.ok) {
          alert(`Pipeline failed at ${step.label}: ${data.error}`);
          break;
        }

        // If the step returned a jobId, poll until it completes before moving on
        if (data.jobId) {
          const pollTimer = startProgressPolling(data.jobId);
          const completed = await waitForJobCompletion(data.jobId, step.label);
          clearInterval(pollTimer);
          if (!completed) break;
        }
      }
    } catch (err) {
      alert(`Pipeline failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setRunningJob(null);
      setJobProgress(null);
      setPipelineRunning(false);
      router.refresh();
    }
  }

  async function waitForJobCompletion(jobId: number, stepLabel: string): Promise<boolean> {
    const maxWait = 300000; // 5 minutes max
    const pollInterval = 2000; // 2 seconds
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      await new Promise((r) => setTimeout(r, pollInterval));
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) continue;
        const job = await res.json();
        if (job.status === "completed") return true;
        if (job.status === "failed") {
          alert(`Pipeline failed at ${stepLabel}: ${job.errorLog || "Unknown error"}`);
          return false;
        }
      } catch {
        // Network error — retry
      }
    }
    alert(`Pipeline timed out at ${stepLabel}`);
    return false;
  }

  function formatDuration(started: string | null, completed: string | null): string {
    if (!started) return "\u2014";
    const start = new Date(started).getTime();
    const end = completed ? new Date(completed).getTime() : Date.now();
    const seconds = Math.round((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }

  function formatTime(iso: string | null): string {
    if (!iso) return "\u2014";
    return new Date(iso).toLocaleString();
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Pipeline Steps */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-500" /> Pipeline
            </CardTitle>
            {["system_admin", "admin", "mapper"].includes(userRole) ? (
              <Button onClick={runFullPipeline} disabled={pipelineRunning || !!runningJob} size="sm" className="bg-teal-500 hover:bg-teal-600 text-white">
                {pipelineRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Pipeline...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Run Full Pipeline
                  </>
                )}
              </Button>
            ) : (
              <Badge variant="outline" className="text-xs">View Only</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Run Full Pipeline executes steps 2-6 sequentially.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {pipelineSteps.map((step) => {
              const status = getStepStatus(step);
              const lastRun = step.jobType ? getLastRun(step.jobType) : null;
              const Icon = step.icon;

              return (
                <div
                  key={step.step}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted/50 transition-colors"
                >
                  {/* Status indicator */}
                  <div className="w-6 text-center flex-shrink-0">
                    {statusIcon(status)}
                  </div>

                  {/* Step info */}
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Step {step.step}</span>
                      <span className="text-sm font-medium">{step.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                    {status === "running" && jobProgress && jobProgress.total > 0 && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden max-w-[200px]">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.round((jobProgress.processed / jobProgress.total) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-blue-600 font-medium">
                          {jobProgress.processed}/{jobProgress.total}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Last run info */}
                  {lastRun && (
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-xs text-muted-foreground">
                        {formatTime(lastRun.startedAt)}
                      </p>
                      {lastRun.status === "completed" && (
                        <p className="text-xs text-muted-foreground">
                          {lastRun.processed ?? 0} processed in {formatDuration(lastRun.startedAt, lastRun.completedAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action */}
                  <div className="flex-shrink-0">
                    {step.type === "link" ? (
                      <Link href={step.href!}>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    ) : !["system_admin", "admin", "mapper"].includes(userRole) ? (
                      <Badge variant="outline" className="text-xs">{status === "completed" ? "Done" : status === "running" ? "Running" : "Pending"}</Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runJob(step.endpoint!, step.jobType!)}
                        disabled={!!runningJob}
                      >
                        {runningJob === step.jobType ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job History</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No jobs have been run yet. Use the pipeline above to start processing.
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
                      {job.jobType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
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
                      {job.errorLog ?? "\u2014"}
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
