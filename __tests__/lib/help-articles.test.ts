import { describe, it, expect } from "vitest";
import {
  ARTICLES,
  getArticleBySlug,
  getArticlesForRole,
  searchArticles,
  HELP_CATEGORIES,
} from "@/content/help/articles";

describe("Help Articles", () => {
  it("has at least 10 articles", () => {
    expect(ARTICLES.length).toBeGreaterThanOrEqual(10);
  });

  it("every article has required fields", () => {
    for (const article of ARTICLES) {
      expect(article.slug).toBeTruthy();
      expect(article.title).toBeTruthy();
      expect(article.summary).toBeTruthy();
      expect(article.category).toBeTruthy();
      expect(article.content).toBeTruthy();
      expect(Array.isArray(article.roles)).toBe(true);
    }
  });

  it("all slugs are unique", () => {
    const slugs = ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("all categories reference valid HELP_CATEGORIES keys", () => {
    for (const article of ARTICLES) {
      expect(Object.keys(HELP_CATEGORIES)).toContain(article.category);
    }
  });

  it("relatedSlugs reference existing articles", () => {
    const slugSet = new Set(ARTICLES.map((a) => a.slug));
    const broken: string[] = [];
    for (const article of ARTICLES) {
      if (article.relatedSlugs) {
        for (const related of article.relatedSlugs) {
          if (!slugSet.has(related)) {
            broken.push(`${article.slug} → ${related}`);
          }
        }
      }
    }
    expect(broken).toEqual([]);
  });
});

describe("getArticleBySlug", () => {
  it("returns article for valid slug", () => {
    const article = getArticleBySlug("what-is-provisum");
    expect(article).toBeDefined();
    expect(article!.title).toBe("What is Provisum?");
  });

  it("returns undefined for invalid slug", () => {
    const article = getArticleBySlug("nonexistent-slug");
    expect(article).toBeUndefined();
  });
});

describe("Admin onboarding guide", () => {
  it("exists as an article", () => {
    const article = getArticleBySlug("admin-onboarding-guide");
    expect(article).toBeDefined();
    expect(article!.category).toBe("admin");
  });

  it("is only visible to admin roles", () => {
    const article = getArticleBySlug("admin-onboarding-guide");
    expect(article!.roles).toContain("admin");
    expect(article!.roles).toContain("system_admin");
    expect(article!.roles).not.toContain("viewer");
    expect(article!.roles).not.toContain("mapper");
  });

  it("covers all 8 phases", () => {
    const article = getArticleBySlug("admin-onboarding-guide");
    expect(article!.content).toContain("Phase 1");
    expect(article!.content).toContain("Phase 2");
    expect(article!.content).toContain("Phase 3");
    expect(article!.content).toContain("Phase 4");
    expect(article!.content).toContain("Phase 5");
    expect(article!.content).toContain("Phase 6");
    expect(article!.content).toContain("Phase 7");
    expect(article!.content).toContain("Phase 8");
  });

  it("includes quick-start checklists", () => {
    const article = getArticleBySlug("admin-onboarding-guide");
    expect(article!.content).toContain("Quick-Start Checklists");
    expect(article!.content).toContain("For Mappers");
    expect(article!.content).toContain("For Approvers");
    expect(article!.content).toContain("For Coordinators");
  });
});

describe("Mapper quick-start guide", () => {
  it("exists and is accessible to mappers", () => {
    const article = getArticleBySlug("quick-start-mapper");
    expect(article).toBeDefined();
    expect(article!.roles).toContain("mapper");
  });
});

describe("Approver quick-start guide", () => {
  it("exists and is accessible to approvers", () => {
    const article = getArticleBySlug("quick-start-approver");
    expect(article).toBeDefined();
    expect(article!.roles).toContain("approver");
  });
});

describe("getArticlesForRole", () => {
  it("returns all articles for admin", () => {
    const articles = getArticlesForRole("admin");
    // Admin should see all articles (both ALL_ROLES=[] and ADMIN_ROLES)
    expect(articles.length).toBeGreaterThanOrEqual(10);
  });

  it("does not return admin-only articles for viewer", () => {
    const articles = getArticlesForRole("viewer");
    const adminOnly = articles.find((a) => a.slug === "admin-onboarding-guide");
    expect(adminOnly).toBeUndefined();
  });

  it("returns mapper guide for mapper role", () => {
    const articles = getArticlesForRole("mapper");
    const mapperGuide = articles.find((a) => a.slug === "quick-start-mapper");
    expect(mapperGuide).toBeDefined();
  });
});

describe("searchArticles", () => {
  it("finds articles by title keyword", () => {
    const results = searchArticles("onboarding", "admin");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((a) => a.slug === "admin-onboarding-guide")).toBe(true);
  });

  it("finds articles by content keyword", () => {
    const results = searchArticles("persona", "admin");
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("respects role filtering", () => {
    const viewerResults = searchArticles("onboarding", "viewer");
    const adminGuide = viewerResults.find((a) => a.slug === "admin-onboarding-guide");
    expect(adminGuide).toBeUndefined();
  });

  it("returns empty for nonsense query", () => {
    const results = searchArticles("zzzzxyzzy12345", "admin");
    expect(results).toHaveLength(0);
  });
});
