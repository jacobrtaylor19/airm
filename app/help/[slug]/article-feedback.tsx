"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Feedback = "up" | "down";

/**
 * "Was this helpful?" thumbs feedback on a KB article.
 *
 * MVP: client-side only. Stores feedback in localStorage keyed by slug to
 * prevent double-submit within the same browser session. No DB persistence
 * — we'll add an `article_feedback` table later if/when we need telemetry.
 */
export function ArticleFeedback({ slug }: { slug: string }) {
  const storageKey = `kb-feedback-${slug}`;
  const [submitted, setSubmitted] = useState<Feedback | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "up" || stored === "down") {
        setSubmitted(stored);
      }
    } catch {
      // localStorage may be unavailable (private browsing, etc.) — ignore
    }
    setHydrated(true);
  }, [storageKey]);

  function submit(value: Feedback) {
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      // Storage failure is non-critical — still update UI state
    }
    setSubmitted(value);
  }

  // Avoid hydration mismatch by not rendering state-dependent UI until mounted
  if (!hydrated) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>Was this helpful?</span>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        <span>Thanks for your feedback.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Was this helpful?</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => submit("up")}
          aria-label="Yes, this article was helpful"
          className={cn(
            "inline-flex items-center justify-center h-8 w-8 rounded-md border border-input",
            "text-muted-foreground hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors"
          )}
        >
          <ThumbsUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => submit("down")}
          aria-label="No, this article was not helpful"
          className={cn(
            "inline-flex items-center justify-center h-8 w-8 rounded-md border border-input",
            "text-muted-foreground hover:text-red-600 hover:border-red-300 hover:bg-red-50",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors"
          )}
        >
          <ThumbsDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
