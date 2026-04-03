import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "demo.admin");
  });

  test("dashboard loads with stat cards", async ({ page }) => {
    // The dashboard should show KPI stat cards
    await expect(page.locator("[data-testid='kpi-card'], .rounded-lg").first()).toBeVisible({
      timeout: 15_000,
    });

    // Verify we see some known dashboard metrics text
    await expect(page.getByText(/Users|Personas|Mapping|SOD/i).first()).toBeVisible();
  });

  test("dashboard shows module sidebar with nav", async ({ page }) => {
    // Navigate to /dashboard which shows the Dashboard module sidebar
    await page.goto("/dashboard", { waitUntil: "commit", timeout: 90_000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 45_000 }).catch(() => {});

    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible({ timeout: 15_000 });

    const nav = sidebar.locator("nav");

    // Dashboard module has its own nav item
    await expect(nav.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();

    // "All Modules" link back to tile launcher
    await expect(nav.getByRole("link", { name: "All Modules" })).toBeVisible();

    // Quick Nav section links to other modules
    await expect(nav.getByText("Quick Nav")).toBeVisible();
    await expect(nav.getByRole("link", { name: "Role Mapping", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Personas", exact: true })).toBeVisible();
  });

  test("sidebar navigation works across modules", async ({ page }) => {
    // Start at the Role Mapping module which has multiple nav items
    await page.goto("/mapping", { waitUntil: "commit", timeout: 90_000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 45_000 }).catch(() => {});

    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible({ timeout: 15_000 });

    // Dismiss the welcome tour modal if visible (its overlay blocks clicks)
    const skipTourBtn = page.getByRole("button", { name: /Skip Tour/i });
    if (await skipTourBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await skipTourBtn.click();
      await page.waitForTimeout(500);
    }

    const nav = sidebar.locator("nav");

    // Role Mapping module sidebar has SOD Analysis link
    await nav.getByRole("link", { name: "SOD Analysis", exact: true }).click();
    await expect(page).toHaveURL(/\/sod/, { timeout: 15_000 });

    // Navigate to Approvals within the same module
    await nav.getByRole("link", { name: "Approvals", exact: true }).click();
    await expect(page).toHaveURL(/\/approvals/, { timeout: 15_000 });

    // Use Quick Nav to go to Dashboard module
    await nav.getByRole("link", { name: "Dashboard", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });
});
