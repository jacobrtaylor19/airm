import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Full Workflow — Admin", () => {
  test.describe.configure({ mode: "serial" });

  test("personas page loads with data", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/personas");

    // Should see persona content (cards or table rows)
    await expect(page.getByText(/Persona/i).first()).toBeVisible({ timeout: 30_000 });

    // Verify actual data is present — look for a table row or card beyond the heading
    const dataContainer = page.locator("table tbody tr, [data-testid='persona-card'], .card");
    const count = await dataContainer.count();
    expect(count).toBeGreaterThan(0);
  });

  test("mapping workspace loads", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/mapping");

    await expect(page.getByText(/Mapping|Role/i).first()).toBeVisible({ timeout: 45_000 });
  });

  test("SOD conflicts page loads with data", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/sod");

    await expect(page.getByText(/SOD|Conflict|Separation of Duties/i).first()).toBeVisible({
      timeout: 45_000,
    });
  });

  test("approval queue loads", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/approvals");

    await expect(page.getByText(/Approval/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test("jobs page loads", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/jobs");

    await expect(page.getByText(/Job|Pipeline/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test("exports page loads", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/exports");

    await expect(page.getByText(/Export/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test("calibration page loads", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/calibration");

    await expect(page.getByText(/Calibration|Confidence/i).first()).toBeVisible({ timeout: 30_000 });
  });
});

test.describe("Full Workflow — Mapper Navigation", () => {
  test.describe.configure({ mode: "serial" });

  test("mapper can browse personas and mapping workspace", async ({ page }) => {
    await login(page, "demo.mapper.finance", undefined, "/personas");

    await expect(page.getByText(/Persona/i).first()).toBeVisible({ timeout: 30_000 });

    // Verify persona data is present
    const dataContainer = page.locator("table tbody tr, [data-testid='persona-card'], .card");
    const count = await dataContainer.count();
    expect(count).toBeGreaterThan(0);

    // Navigate to mapping workspace (heavy page — use commit + longer timeout)
    await page.goto("/mapping", { waitUntil: "commit", timeout: 90_000 });

    // Mapping workspace should list personas
    await expect(page.getByText(/Mapping|Persona|Role/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });
});
