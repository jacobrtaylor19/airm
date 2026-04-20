import { describe, it, expect } from "vitest";
import {
  ARTICLES,
  getArticleBySlug,
  getArticlesForRole,
  searchArticles,
  HELP_CATEGORIES,
} from "@/content/help/articles";

describe("Help Articles", () => {
  it("has at least 25 articles (Phase 2 target)", () => {
    expect(ARTICLES.length).toBeGreaterThanOrEqual(25);
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
    expect(articles.length).toBeGreaterThanOrEqual(25);
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

describe("Phase 2 — New article inventory", () => {
  const PHASE_2_SLUGS = [
    // Mapper Workflow
    "mapping-queue",
    "bulk-mapping",
    "overriding-ai-suggestions",
    "submitting-for-approval",
    // Approver Workflow
    "approval-queue",
    "approving-and-rejecting",
    "reviewing-sod-conflicts",
    // Coordinator Workflow
    "coordinator-overview",
    "setting-due-dates",
    "sending-notifications",
    // Core Concepts
    "permission-gap-analysis",
    "releases-and-waves",
    // Admin Reference
    "uploading-target-roles",
    "running-the-ai-pipeline",
    "exporting-data",
  ];

  it("all 15 Phase 2 articles are present", () => {
    for (const slug of PHASE_2_SLUGS) {
      const article = getArticleBySlug(slug);
      expect(article, `missing article: ${slug}`).toBeDefined();
    }
  });

  it("each Phase 2 article has a summary and non-trivial content", () => {
    for (const slug of PHASE_2_SLUGS) {
      const article = getArticleBySlug(slug)!;
      expect(article.summary.length).toBeGreaterThan(20);
      expect(article.content.length).toBeGreaterThan(200);
    }
  });

  it("mapper sees Mapper Workflow articles", () => {
    const articles = getArticlesForRole("mapper");
    const slugs = articles.map((a) => a.slug);
    expect(slugs).toContain("mapping-queue");
    expect(slugs).toContain("bulk-mapping");
    expect(slugs).toContain("overriding-ai-suggestions");
    expect(slugs).toContain("submitting-for-approval");
  });

  it("approver sees Approver Workflow articles", () => {
    const articles = getArticlesForRole("approver");
    const slugs = articles.map((a) => a.slug);
    expect(slugs).toContain("approval-queue");
    expect(slugs).toContain("approving-and-rejecting");
    expect(slugs).toContain("reviewing-sod-conflicts");
  });

  it("coordinator sees Coordinator Workflow articles", () => {
    const articles = getArticlesForRole("coordinator");
    const slugs = articles.map((a) => a.slug);
    expect(slugs).toContain("coordinator-overview");
    expect(slugs).toContain("setting-due-dates");
    expect(slugs).toContain("sending-notifications");
  });

  it("viewer does NOT see workflow-specific articles", () => {
    const articles = getArticlesForRole("viewer");
    const slugs = articles.map((a) => a.slug);
    // Workflow articles are role-gated
    expect(slugs).not.toContain("mapping-queue");
    expect(slugs).not.toContain("approval-queue");
    expect(slugs).not.toContain("coordinator-overview");
  });

  it("core-concept articles (Phase 2) are visible to all roles", () => {
    for (const role of ["viewer", "mapper", "approver", "coordinator"]) {
      const articles = getArticlesForRole(role);
      const slugs = articles.map((a) => a.slug);
      expect(slugs, `${role} missing permission-gap-analysis`).toContain("permission-gap-analysis");
      expect(slugs, `${role} missing releases-and-waves`).toContain("releases-and-waves");
    }
  });

  it("admin-reference articles (Phase 2) are only visible to admin/system_admin", () => {
    const adminSlugs = getArticlesForRole("admin").map((a) => a.slug);
    expect(adminSlugs).toContain("uploading-target-roles");
    expect(adminSlugs).toContain("running-the-ai-pipeline");
    expect(adminSlugs).toContain("exporting-data");

    const viewerSlugs = getArticlesForRole("viewer").map((a) => a.slug);
    expect(viewerSlugs).not.toContain("uploading-target-roles");
    expect(viewerSlugs).not.toContain("running-the-ai-pipeline");
    expect(viewerSlugs).not.toContain("exporting-data");
  });
});
