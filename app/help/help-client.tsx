"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, ChevronRight } from "lucide-react";

interface ArticleSummary {
  slug: string;
  title: string;
  summary: string;
  category: string;
}

interface Props {
  articles: ArticleSummary[];
  categories: Record<string, { label: string; description: string }>;
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

export function HelpClient({ articles, categories }: Props) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = articles;
    if (activeCategory) {
      result = result.filter((a) => a.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q)
      );
    }
    return result;
  }, [articles, search, activeCategory]);

  const categoryKeys = Object.keys(categories);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            activeCategory === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All ({articles.length})
        </button>
        {categoryKeys.map((key) => {
          const count = articles.filter((a) => a.category === key).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(activeCategory === key ? null : key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategory === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {categories[key].label} ({count})
            </button>
          );
        })}
      </div>

      {/* Articles list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {search ? "No articles match your search." : "No articles available for your role."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((article) => (
            <Link key={article.slug} href={`/help/${article.slug}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{article.title}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${CATEGORY_COLORS[article.category] ?? ""}`}
                      >
                        {categories[article.category]?.label ?? article.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                      {article.summary}
                    </p>
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
