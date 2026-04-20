"use client";

import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Contextual `?` link to a Knowledge Base article.
 * Used inline after badges, labels, or controls that reference KB-documented concepts.
 *
 * Opens the article in a new tab so the user's workflow context is preserved.
 */
export interface HelpTooltipProps {
  /** Slug of the target article (see content/help/articles.ts) */
  slug: string;
  /** Accessible label; defaults to "Learn more" */
  label?: string;
  /** Extra classes (e.g. ml-1 for spacing) */
  className?: string;
  /** Icon size — sm (h-3.5) for tight inline use, md (h-4) for headers */
  size?: "sm" | "md";
}

export function HelpTooltip({
  slug,
  label = "Learn more",
  className,
  size = "sm",
}: HelpTooltipProps) {
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <Link
      href={`/help/${slug}`}
      aria-label={label}
      title={label}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center text-muted-foreground transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded-full",
        className
      )}
    >
      <HelpCircle className={iconClass} aria-hidden="true" />
    </Link>
  );
}
