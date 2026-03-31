import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Core Workflow Pages", () => {
  test("personas page loads with data", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/personas");

    // Wait for page content to load
    await expect(page.getByText(/Persona/i).first()).toBeVisible({ timeout: 30_000 });

    // The page should show persona cards or a table with actual data
    const dataRows = page.locator("table tbody tr, [data-testid='persona-card'], .card");
    await expect(dataRows.first()).toBeVisible({ timeout: 15_000 });
  });

  test("mapping page loads", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/mapping");

    // Wait for the mapping workspace to render (heavy page, needs extra time)
    await expect(page.getByText(/Mapping|Role/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test("SOD conflicts page loads", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/sod");

    // Wait for the SOD analysis page (heavy page)
    await expect(page.getByText(/SOD|Conflict|Separation of Duties/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
