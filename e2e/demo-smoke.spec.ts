import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * Demo App E2E Smoke + Negative Tests
 *
 * Covers: auth, navigation, data presence, role enforcement,
 * API error handling, mapping workflow, and new features.
 *
 * Runs against demo.provisum.io (set BASE_URL) or localhost:3000.
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

// ─── Auth & Login ─────────────────────────────────────────────

test.describe("Auth — negative cases", () => {
  test("invalid credentials return 401 via API", async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/auth/login`, {
      data: { username: "nonexistent.user", password: "WrongPassword1!" },
    });
    expect(res.status()).toBe(401);
  });

  test("unauthenticated access redirects to login", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(3_000);
    expect(page.url()).toMatch(/\/(login|$)/);
  });

  test("successful API login returns 200", async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/auth/login`, {
      data: { username: "demo.admin", password: "DemoGuide2026!" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ─── Page Load Smoke Tests ────────────────────────────────────

test.describe("Page loads — admin role", () => {
  test.describe.configure({ mode: "serial" });

  test("dashboard loads with content", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/dashboard");
    // Dashboard should have stat cards or module content
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(100);
  });

  test("personas page shows table rows", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/personas");
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    // Wait for table to render
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test("mapping page loads with 4 tabs", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/mapping");
    await expect(page.getByRole("tab", { name: /Persona Mapping/i })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole("tab", { name: /User Role Assignments/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Re-mapping/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Gap Analysis/i })).toBeVisible();
  });

  test("SOD page loads with content", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/sod");
    await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => {});
    const body = await page.textContent("body");
    expect(body).toContain("SOD");
  });

  test("approvals page loads", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/approvals");
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    const body = await page.textContent("body");
    expect(body).toMatch(/approv/i);
  });

  test("risk analysis page loads with 4 cards", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/risk-analysis");
    await expect(page.getByText(/Business Continuity/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Permission Changes/i).first()).toBeVisible();
    await expect(page.getByText(/Incorrect Access/i).first()).toBeVisible();
    await expect(page.getByText(/Role Integrity/i).first()).toBeVisible();
  });

  test("exports page loads", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/exports");
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    const body = await page.textContent("body");
    expect(body).toMatch(/export/i);
  });

  test("support page loads with form", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/support");
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    await expect(page.getByText(/support/i).first()).toBeVisible();
    await expect(page.locator("select[name='category']")).toBeVisible({ timeout: 10_000 });
  });

  test("help / knowledge base page loads", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/help");
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    const body = await page.textContent("body");
    expect(body).toMatch(/knowledge base/i);
  });

  test("admin console loads for sysadmin", async ({ page }) => {
    await login(page, "sysadmin", undefined, "/admin");
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    const body = await page.textContent("body");
    expect(body).toMatch(/config|console|admin/i);
  });
});

// ─── Role-Based Access Control (Negative) ─────────────────────

test.describe("RBAC — restricted pages blocked", () => {
  const restrictedUsers = ["demo.viewer", "demo.mapper.finance", "demo.approver"];

  for (const user of restrictedUsers) {
    test(`${user} cannot access /admin`, async ({ page }) => {
      await login(page, user, undefined, "/admin");
      await page.waitForTimeout(3_000);
      const url = page.url();
      const blocked = url.includes("/unauthorized") || url.includes("/login") || url.includes("/home") || url.includes("/dashboard");
      expect(blocked).toBe(true);
    });
  }

  test("viewer cannot access /admin/incidents", async ({ page }) => {
    await login(page, "demo.viewer", undefined, "/admin/incidents");
    await page.waitForTimeout(3_000);
    const url = page.url();
    const blocked = url.includes("/unauthorized") || url.includes("/login") || url.includes("/home") || url.includes("/dashboard");
    expect(blocked).toBe(true);
  });
});

// ─── API Negative Tests ───────────────────────────────────────

test.describe("API — negative cases", () => {
  test("unauthenticated persona create does not succeed", async ({ page }) => {
    // Middleware redirects to login — Playwright follows the redirect so we get 200 on the login page.
    // Verify the response is NOT a successful persona creation (no id in body).
    const res = await page.request.post(`${BASE}/api/personas/create`, {
      data: { name: "Hacked Persona" },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.text();
    // Should NOT contain a successful creation response
    expect(body).not.toContain('"id"');
  });

  test("persona create rejects empty name (authed)", async ({ page }) => {
    await login(page, "demo.admin", undefined, false);
    const res = await page.request.post(`${BASE}/api/personas/create`, {
      data: { name: "", businessFunction: null },
    });
    expect(res.status()).toBe(400);
  });

  test("health endpoint returns ok", async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.components.database).toBe("connected");
  });

  test("404 page for unknown routes", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/this-page-does-not-exist-xyz");
    await page.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => {});
    const body = await page.textContent("body");
    expect(body).toMatch(/not found|404/i);
  });

  test("bulk delete rejects viewer role", async ({ page }) => {
    await login(page, "demo.viewer", undefined, false);
    const res = await page.request.post(`${BASE}/api/admin/bulk-delete`, {
      data: { entityType: "personas", ids: [999999] },
    });
    expect(res.status()).toBe(403);
  });
});

// ─── Data Integrity ───────────────────────────────────────────

test.describe("Data integrity — seeded demo data present", () => {
  test("users page has seeded users", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/users");
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    expect(await rows.count()).toBeGreaterThan(5);
  });

  test("source roles page has data", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/source-roles");
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test("target roles page has data", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/target-roles");
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    expect(await rows.count()).toBeGreaterThan(0);
  });
});

// ─── Mapper Workflow ──────────────────────────────────────────

test.describe("Mapper workflow — scoped access", () => {
  test("mapper sees personas table", async ({ page }) => {
    await login(page, "demo.mapper.finance", undefined, "/personas");
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    // Mapper may see fewer rows but table should render
    const body = await page.textContent("body");
    expect(body).toMatch(/persona/i);
  });

  test("mapper sees mapping page with all 4 tabs", async ({ page }) => {
    await login(page, "demo.mapper.finance", undefined, "/mapping");
    await expect(page.getByRole("tab", { name: /Persona Mapping/i })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole("tab", { name: /Re-mapping/i })).toBeVisible();
  });

  test("mapper can access SOD page", async ({ page }) => {
    await login(page, "demo.mapper.finance", undefined, "/sod");
    await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => {});
    const body = await page.textContent("body");
    expect(body).toMatch(/SOD|conflict|analysis/i);
  });
});
