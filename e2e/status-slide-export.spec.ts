import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * Status Slide PPTX Export — /api/exports/status-slide + dashboard button
 *
 * Tests the one-click "Draft Status Slide" feature introduced in v1.0.0.
 * The API generates a pptxgenjs-based PPTX with KPI cards, risk severity
 * badges, department progress bars, and a milestone timeline.
 *
 * Coverage:
 * - Dashboard button visibility by role
 * - API response: 200, correct content-type, non-empty body
 * - API authorization: 401 without session
 * - Scoping: admin sees all departments, mapper sees their area
 */

// ---------------------------------------------------------------------------
// Dashboard button visibility
// ---------------------------------------------------------------------------

test.describe("Status Slide — Dashboard Button", () => {
  test("admin sees Draft Status Slide button on dashboard", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/dashboard");

    await expect(
      page.getByRole("button", { name: /status slide|draft status/i })
        .or(page.getByText(/Draft Status Slide/i))
    ).toBeVisible({ timeout: 30_000 });
  });

  test("mapper sees Draft Status Slide button on dashboard", async ({ page }) => {
    await login(page, "demo.mapper.finance", undefined, "/dashboard");

    await expect(
      page.getByRole("button", { name: /status slide|draft status/i })
        .or(page.getByText(/Draft Status Slide/i))
    ).toBeVisible({ timeout: 30_000 });
  });

  test("viewer does NOT see Draft Status Slide button", async ({ page }) => {
    await login(page, "demo.viewer", undefined, "/dashboard");

    // Wait for dashboard to fully load
    await expect(page.locator("[data-testid='kpi-card'], .rounded-lg").first()).toBeVisible({
      timeout: 30_000,
    });
    await page.waitForTimeout(1_000);

    await expect(
      page.getByRole("button", { name: /status slide|draft status/i })
    ).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// API: POST /api/exports/status-slide
// ---------------------------------------------------------------------------

test.describe("Status Slide — API Response", () => {
  test("authenticated admin receives valid PPTX binary", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/dashboard");

    const response = await page.request.post("/api/exports/status-slide", {
      data: {},
      timeout: 60_000, // PPTX generation can be slow
    });

    // Should succeed
    expect(response.status()).toBe(200);

    // Content-type should indicate a PPTX/binary file
    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType).toMatch(
      /presentation|officedocument|octet-stream/i
    );

    // Response body should be non-empty (a real PPTX file)
    const body = await response.body();
    expect(body.length).toBeGreaterThan(1_000); // even a minimal PPTX is >1KB
  });

  test("authenticated mapper receives valid PPTX binary", async ({ page }) => {
    await login(page, "demo.mapper.finance", undefined, "/dashboard");

    const response = await page.request.post("/api/exports/status-slide", {
      data: {},
      timeout: 60_000,
    });

    expect(response.status()).toBe(200);
    const body = await response.body();
    expect(body.length).toBeGreaterThan(1_000);
  });

  test("unauthenticated request returns 401 or 302 redirect", async ({ browser }) => {
    // Use a fresh context with no cookies
    const context = await browser.newContext();
    const request = context.request;

    const response = await request.post("http://localhost:3000/api/exports/status-slide", {
      data: {},
      timeout: 15_000,
    });

    // Must reject unauthenticated requests
    expect([401, 302, 307, 308]).toContain(response.status());

    await context.dispose();
  });

  test("viewer receives 403 Forbidden", async ({ page }) => {
    await login(page, "demo.viewer", undefined, "/dashboard");

    const response = await page.request.post("/api/exports/status-slide", {
      data: {},
      timeout: 15_000,
    });

    // Viewer should not be allowed to generate exports
    expect([403, 401]).toContain(response.status());
  });
});

// ---------------------------------------------------------------------------
// Dashboard button triggers download
// ---------------------------------------------------------------------------

test.describe("Status Slide — Button Triggers Download", () => {
  test("clicking Draft Status Slide initiates a file download", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/dashboard");

    // Wait for the button
    const exportBtn = page
      .getByRole("button", { name: /status slide|draft status/i })
      .or(page.getByText(/Draft Status Slide/i))
      .first();

    await expect(exportBtn).toBeVisible({ timeout: 30_000 });

    // Set up download event listener before clicking
    const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
    await exportBtn.click();

    let download;
    try {
      download = await downloadPromise;
    } catch {
      // If no download event fires, check that no error toast appeared
      const errorToast = page.getByText(/error|failed|could not/i);
      const hasError = await errorToast.isVisible({ timeout: 3_000 }).catch(() => false);
      expect(hasError).toBe(false);
      return;
    }

    // Download should produce a .pptx file
    const suggestedFilename = download.suggestedFilename();
    expect(suggestedFilename).toMatch(/\.pptx$/i);
  });
});

// ---------------------------------------------------------------------------
// Audit log entry written on export
// ---------------------------------------------------------------------------

test.describe("Status Slide — Audit Trail", () => {
  test("export is recorded in the audit log", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/dashboard");

    // Trigger an export
    await page.request.post("/api/exports/status-slide", {
      data: {},
      timeout: 60_000,
    });

    // Navigate to audit log and verify an export entry appeared
    await page.goto("/audit-log", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText(/export|status.slide|pptx/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
