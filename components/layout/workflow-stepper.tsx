import Link from "next/link";
import { cn } from "@/lib/utils";
import { Upload, UserCircle, Route, ShieldAlert, CheckCircle } from "lucide-react";

export type WorkflowStage = {
  label: string;
  href: string;
  icon: React.ElementType;
  status: "complete" | "active" | "partial" | "not_started";
  detail?: string;
};

export function WorkflowStepper({ stages }: { stages: WorkflowStage[] }) {
  return (
    <div className="mb-6 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex flex-1 items-center">
            <Link
              href={stage.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1.5 rounded-lg p-2.5 text-center transition-all hover:bg-muted/60 hover:shadow-sm",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors",
                  stage.status === "complete" && "bg-primary text-primary-foreground shadow-sm",
                  stage.status === "active" && "bg-primary/15 text-primary ring-2 ring-primary/50",
                  stage.status === "partial" && "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300",
                  stage.status === "not_started" && "bg-muted text-muted-foreground"
                )}
              >
                <stage.icon className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  stage.status === "not_started"
                    ? "text-muted-foreground"
                    : "text-foreground"
                )}
              >
                {stage.label}
              </span>
              {stage.detail && (
                <span className="text-[10px] leading-tight text-muted-foreground">
                  {stage.detail}
                </span>
              )}
            </Link>
            {i < stages.length - 1 && (
              <div
                className={cn(
                  "mx-1 h-px w-8 flex-shrink-0 transition-colors",
                  stage.status === "complete" ? "bg-primary/60" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export const workflowIcons = { Upload, UserCircle, Route, ShieldAlert, CheckCircle };
