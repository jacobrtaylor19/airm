import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * Focused role-based access control tests.
 * Verifies that restricted pages block unauthorized roles.
 * Positive-access tests for most pages are covered in other spec files
 * (dashboard, full-workflow, mapping-workflow, approvals, notifications, admin-features).
 */

/**
 * Helper: verify that a page blocks access (redirects to /unauthorized or /login,
 * or shows "Access Denied" text).
 */
async function expectBlocked(page: import("@playwright/test").Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded", timeout: 45_000 });

  // Wait for the server-side redirect to /unauthorized or /login to land
  // requireRole() calls redirect("/unauthorized") which is a server-side redirect
  await page.waitForURL(/\/(unauthorized|login)/, { timeout: 10_000 }).catch(() => {
    // If no redirect happened, fall through to content check below
  });

  const url = page.url();
  const pageText = await page.locator("body").textContent().catch(() => "") ?? "";
  const isBlocked =
    url.includes("/unauthorized") ||
    url.includes("/login") ||
    /access denied/i.test(pageText) ||
    /you do not have permission/i.test(pageText);
  expect(isBlocked).toBe(true);
}

test.describe("Role Access — Admin console requires system_admin", () => {
  test("admin role cannot access /admin", async ({ page }) => {
    await login(page, "demo.admin");
    await expectBlocked(page, "/admin");
  });

  test("mapper cannot access /admin", async ({ page }) => {
    await login(page, "demo.mapper.finance");
    await expectBlocked(page, "/admin");
  });

  test("approver cannot access /admin", async ({ page }) => {
    await login(page, "demo.approver");
    await expectBlocked(page, "/admin");
  });

  test("viewer cannot access /admin", async ({ page }) => {
    await login(page, "demo.viewer");
    await expectBlocked(page, "/admin");
  });

  test("coordinator cannot access /admin", async ({ page }) => {
    await login(page, "demo.coordinator");
    await expectBlocked(page, "/admin");
  });
});

test.describe("Role Access — Viewer restrictions", () => {
  test("viewer cannot access /calibration", async ({ page }) => {
    await login(page, "demo.viewer");
    await expectBlocked(page, "/calibration");
  });
});

test.describe("Role Access — Positive access spot checks", () => {
  test("system_admin can access /admin", async ({ page }) => {
    await login(page, "sysadmin", undefined, "/admin");

    expect(page.url()).not.toMatch(/\/login/);
    expect(page.url()).not.toMatch(/\/unauthorized/);
    const main = page.locator("main, [role='main'], .flex-1");
    await expect(main.first()).toBeVisible({ timeout: 30_000 });
  });

  test("approver can access /dashboard", async ({ page }) => {
    await login(page, "demo.approver");
    expect(page.url()).toMatch(/\/dashboard/);
    const main = page.locator("main, [role='main'], .flex-1");
    await expect(main.first()).toBeVisible({ timeout: 30_000 });
  });

  test("viewer can access /dashboard", async ({ page }) => {
    await login(page, "demo.viewer");
    expect(page.url()).toMatch(/\/dashboard/);
    const main = page.locator("main, [role='main'], .flex-1");
    await expect(main.first()).toBeVisible({ timeout: 30_000 });
  });

  test("coordinator can access /dashboard", async ({ page }) => {
    await login(page, "demo.coordinator");
    expect(page.url()).toMatch(/\/dashboard/);
    const main = page.locator("main, [role='main'], .flex-1");
    await expect(main.first()).toBeVisible({ timeout: 30_000 });
  });
});
