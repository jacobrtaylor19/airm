"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UploadSectionProps {
  title: string;
  uploaded: number;
  total: number;
  isAdmin: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function UploadSection({
  title,
  uploaded,
  total,
  isAdmin,
  defaultOpen,
  children,
}: UploadSectionProps) {
  const isComplete = uploaded >= total;
  const [open, setOpen] = useState(defaultOpen ?? !isComplete);

  const badgeColor = isComplete
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : uploaded > 0
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-100 text-slate-500 border-slate-200";

  return (
    <div className="rounded-lg border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
          <span className="text-sm font-semibold text-slate-700">{title}</span>
        </div>
        <Badge variant="outline" className={`text-xs ${badgeColor}`}>
          {uploaded}/{total} uploaded
        </Badge>
      </button>
      {open && (
        <div className={`px-4 pb-4 ${!isAdmin ? "opacity-75" : ""}`}>
          <div className="grid gap-4 md:grid-cols-2">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
