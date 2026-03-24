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
    <div className="mb-6 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex flex-1 items-center">
            <Link
              href={stage.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-md p-2 text-center transition-colors hover:bg-muted",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                  stage.status === "complete" && "bg-primary text-primary-foreground",
                  stage.status === "active" && "bg-primary/20 text-primary ring-2 ring-primary",
                  stage.status === "partial" && "bg-yellow-100 text-yellow-700",
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
                <span className="text-[10px] text-muted-foreground">{stage.detail}</span>
              )}
            </Link>
            {i < stages.length - 1 && (
              <div
                className={cn(
                  "mx-1 h-px w-8 flex-shrink-0",
                  stage.status === "complete" ? "bg-primary" : "bg-border"
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
