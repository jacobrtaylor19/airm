"use client";

import { useState } from "react";
import { Presentation, Loader2 } from "lucide-react";

export function StatusSlideButton() {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleClick() {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/exports/status-slide");
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(err.error);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `provisum-status-${new Date().toISOString().split("T")[0]}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silent — user sees no download
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isGenerating}
      className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-white/60 px-3 py-1.5 text-xs font-medium text-brand-text hover:bg-white/90 hover:border-brand-accent/30 transition-all disabled:opacity-50"
    >
      {isGenerating ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-accent" />
      ) : (
        <Presentation className="h-3.5 w-3.5 text-brand-accent" />
      )}
      {isGenerating ? "Generating…" : "Draft Status Slide"}
    </button>
  );
}
