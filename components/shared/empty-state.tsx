import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionVariant?: "default" | "teal";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionVariant = "default",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 px-6 text-center">
      <Icon className="h-12 w-12 text-slate-300 mb-4" />
      <h3 className="text-sm font-semibold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="mt-4">
          <Button
            size="sm"
            className={actionVariant === "teal" ? "bg-teal-500 hover:bg-teal-600 text-white" : ""}
          >
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}
