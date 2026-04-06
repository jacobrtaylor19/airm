"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronRight, MessageCircle } from "lucide-react";
import { HELP_CATEGORIES } from "@/content/help/articles";

interface ArticleData {
  slug: string;
  title: string;
  summary: string;
  category: string;
  content: string;
}

interface RelatedArticle {
  slug: string;
  title: string;
  summary: string;
}

interface Props {
  article: ArticleData;
  related: RelatedArticle[];
}

const CATEGORY_COLORS: Record<string, string> = {
  "getting-started": "border-blue-300 text-blue-700 bg-blue-50",
  workflow: "border-teal-300 text-teal-700 bg-teal-50",
  admin: "border-slate-300 text-slate-600 bg-slate-50",
  roles: "border-purple-300 text-purple-700 bg-purple-50",
  sod: "border-amber-300 text-amber-700 bg-amber-50",
  ai: "border-violet-300 text-violet-700 bg-violet-50",
  troubleshooting: "border-orange-300 text-orange-700 bg-orange-50",
};

/**
 * Simple markdown-to-HTML renderer for article content.
 * Handles: ## headings, ### headings, **bold**, `code`, - lists, | tables, blank lines.
 */
function renderContent(content: string): string {
  const lines = content.split("\n");
  const html: string[] = [];
  let inList = false;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Close list if needed
    if (inList && !line.startsWith("- ") && !line.startsWith("* ")) {
      html.push("</ul>");
      inList = false;
    }

    // Close table if needed
    if (inTable && !line.startsWith("|")) {
      html.push("</tbody></table></div>");
      inTable = false;
    }

    if (!line) {
      html.push("");
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      html.push(`<h3 class="text-base font-semibold mt-5 mb-2">${inlineFormat(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      html.push(`<h2 class="text-lg font-bold mt-6 mb-3">${inlineFormat(line.slice(3))}</h2>`);
      continue;
    }

    // Lists
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        html.push('<ul class="list-disc pl-5 space-y-1 text-sm">');
        inList = true;
      }
      html.push(`<li>${inlineFormat(line.slice(2))}</li>`);
      continue;
    }

    // Numbered lists
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (!inList) {
        html.push('<ol class="list-decimal pl-5 space-y-1 text-sm">');
        inList = true;
      }
      html.push(`<li>${inlineFormat(numMatch[2])}</li>`);
      continue;
    }

    // Table
    if (line.startsWith("|")) {
      // Skip separator rows
      if (line.match(/^\|[\s-|]+\|$/)) continue;

      if (!inTable) {
        html.push('<div class="overflow-x-auto my-3"><table class="w-full text-sm border-collapse">');
        // First table row is header
        const cells = line.split("|").filter(Boolean).map((c) => c.trim());
        html.push("<thead><tr>");
        for (const cell of cells) {
          html.push(`<th class="border px-3 py-1.5 text-left font-medium bg-muted/50">${inlineFormat(cell)}</th>`);
        }
        html.push("</tr></thead><tbody>");
        inTable = true;
        continue;
      }

      const cells = line.split("|").filter(Boolean).map((c) => c.trim());
      html.push("<tr>");
      for (const cell of cells) {
        html.push(`<td class="border px-3 py-1.5">${inlineFormat(cell)}</td>`);
      }
      html.push("</tr>");
      continue;
    }

    // Paragraph
    html.push(`<p class="text-sm leading-relaxed mb-2">${inlineFormat(line)}</p>`);
  }

  if (inList) html.push("</ul>");
  if (inTable) html.push("</tbody></table></div>");

  return html.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function inlineFormat(text: string): string {
  // Escape HTML first, then apply safe formatting
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>');
}

export function ArticleClient({ article, related }: Props) {
  const categoryLabel = HELP_CATEGORIES[article.category]?.label ?? article.category;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link href="/help" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Knowledge Base
      </Link>

      {/* Article header */}
      <div>
        <Badge variant="outline" className={`text-[10px] mb-2 ${CATEGORY_COLORS[article.category] ?? ""}`}>
          {categoryLabel}
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">{article.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{article.summary}</p>
      </div>

      {/* Article content */}
      <Card>
        <CardContent className="p-6">
          <div
            className="prose-sm"
            dangerouslySetInnerHTML={{ __html: renderContent(article.content) }}
          />
        </CardContent>
      </Card>

      {/* Ask Lumen */}
      <Card className="border-teal-200 bg-teal-50/30">
        <CardContent className="p-4 flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-teal-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-teal-800">Have a question about this topic?</p>
            <p className="text-xs text-teal-600">Ask Lumen for help — click the chat widget in the bottom right.</p>
          </div>
        </CardContent>
      </Card>

      {/* Related articles */}
      {related.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Related Articles</h2>
          {related.map((r) => (
            <Link key={r.slug} href={`/help/${r.slug}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{r.title}</span>
                    <p className="text-xs text-muted-foreground line-clamp-1">{r.summary}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
