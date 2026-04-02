import { requireAuth } from "@/lib/auth";
import { getArticlesForRole, HELP_CATEGORIES } from "@/content/help/articles";
import { HelpClient } from "./help-client";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const user = await requireAuth();
  const articles = getArticlesForRole(user.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Guides, tutorials, and reference material for Provisum.
        </p>
      </div>
      <HelpClient
        articles={articles.map((a) => ({
          slug: a.slug,
          title: a.title,
          summary: a.summary,
          category: a.category,
        }))}
        categories={HELP_CATEGORIES}
      />
    </div>
  );
}
