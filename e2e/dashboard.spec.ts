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

  test("dashboard shows navigation sidebar", async ({ page }) => {
    // Scope to the sidebar navigation to avoid matching dashboard cards and brand link
    const sidebar = page.locator("aside, [role='complementary']").first();
    await expect(sidebar).toBeVisible({ timeout: 15_000 });

    const nav = sidebar.locator("nav");
    await expect(nav.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Personas", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Role Mapping", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "SOD Analysis", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Approvals", exact: true })).toBeVisible();
  });

  test("sidebar navigation works", async ({ page }) => {
    const sidebar = page.locator("aside, [role='complementary']").first();
    await expect(sidebar).toBeVisible({ timeout: 15_000 });

    // Dismiss the welcome tour modal if visible (its overlay blocks clicks)
    const skipTourBtn = page.getByRole("button", { name: /Skip Tour/i });
    if (await skipTourBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await skipTourBtn.click();
      await page.waitForTimeout(500);
    }

    const nav = sidebar.locator("nav");

    // Click on Personas in the sidebar
    await nav.getByRole("link", { name: "Personas", exact: true }).click();
    await expect(page).toHaveURL(/\/personas/, { timeout: 15_000 });

    // Navigate to Role Mapping
    await nav.getByRole("link", { name: "Role Mapping", exact: true }).click();
    await expect(page).toHaveURL(/\/mapping/, { timeout: 15_000 });

    // Navigate back to Dashboard
    await nav.getByRole("link", { name: "Dashboard", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });
});
