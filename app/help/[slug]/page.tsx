import { requireAuth } from "@/lib/auth";
import { getArticleBySlug, getArticlesForRole } from "@/content/help/articles";
import { notFound } from "next/navigation";
import { ArticleClient } from "./article-client";

export const dynamic = "force-dynamic";

export default async function HelpArticlePage({ params }: { params: { slug: string } }) {
  const user = await requireAuth();
  const article = getArticleBySlug(params.slug);

  if (!article) notFound();

  // Check role access
  if (article.roles.length > 0 && !article.roles.includes(user.role)) {
    notFound();
  }

  // Get related articles (filtered by role)
  const userArticles = getArticlesForRole(user.role);
  const related = (article.relatedSlugs ?? [])
    .map((slug) => userArticles.find((a) => a.slug === slug))
    .filter((a): a is NonNullable<typeof a> => a !== undefined)
    .map((a) => ({ slug: a.slug, title: a.title, summary: a.summary }));

  return (
    <ArticleClient
      article={{
        slug: article.slug,
        title: article.title,
        summary: article.summary,
        category: article.category,
        content: article.content,
      }}
      related={related}
    />
  );
}
