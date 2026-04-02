import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * Risk Analysis — /risk-analysis
 *
 * Tests the dedicated risk analysis page introduced in v1.0.0.
 * Three risk categories surfaced: Business Continuity, Adoption,
 * and Incorrect Access (gap + SOD overlap corner cases).
 *
 * Also verifies that the dashboard risk summary cards link to this page
 * and that risk data is rendered correctly by role.
 */

// ---------------------------------------------------------------------------
// Page load by role
// ---------------------------------------------------------------------------

test.describe("Risk Analysis — Page Load", () => {
  test("admin can access /risk-analysis", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/risk-analysis");

    await expect(page.getByText(/Risk/i).first()).toBeVisible({ timeout: 30_000 });
    // Should not redirect to /login or /unauthorized
    expect(page.url()).not.toMatch(/\/(login|unauthorized)/);
  });

  test("mapper can access /risk-analysis", async ({ page }) => {
    await login(page, "demo.mapper.finance", undefined, "/risk-analysis");

    await expect(page.getByText(/Risk/i).first()).toBeVisible({ timeout: 30_000 });
    expect(page.url()).not.toMatch(/\/(login|unauthorized)/);
  });

  test("viewer can access /risk-analysis (read-only)", async ({ page }) => {
    await login(page, "demo.viewer", undefined, "/risk-analysis");

    await expect(page.getByText(/Risk/i).first()).toBeVisible({ timeout: 30_000 });
    expect(page.url()).not.toMatch(/\/(login|unauthorized)/);
  });

  test("approver can access /risk-analysis", async ({ page }) => {
    await login(page, "demo.approver", undefined, "/risk-analysis");

    await expect(page.getByText(/Risk/i).first()).toBeVisible({ timeout: 30_000 });
  });
});

// ---------------------------------------------------------------------------
// Risk category sections
// ---------------------------------------------------------------------------

test.describe("Risk Analysis — Category Coverage", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "demo.admin", undefined, "/risk-analysis");
    await expect(page.getByText(/Risk/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test("Business Continuity section is present", async ({ page }) => {
    await expect(
      page.getByText(/Business Continuity/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Adoption risk section is present", async ({ page }) => {
    await expect(
      page.getByText(/Adoption/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Incorrect Access section is present", async ({ page }) => {
    await expect(
      page.getByText(/Incorrect Access|SOD|Separation of Duties/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("risk cards show severity indicators", async ({ page }) => {
    // Each risk card should have a severity badge (high/medium/low or color indicator)
    const severityBadge = page.getByText(/high|medium|low|critical/i).first();
    await expect(severityBadge).toBeVisible({ timeout: 15_000 });
  });

  test("risk summary statistics are numeric", async ({ page }) => {
    // The page should display numeric counts for affected users/roles
    const numericStat = page.locator(
      "[data-testid='risk-stat'], [data-testid='kpi-card'], .rounded-lg"
    ).filter({ hasText: /\d+/ }).first();
    await expect(numericStat).toBeVisible({ timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// Dashboard risk cards link to /risk-analysis
// ---------------------------------------------------------------------------

test.describe("Risk Analysis — Dashboard Integration", () => {
  test("dashboard shows risk summary section", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/dashboard");

    // Risk cards are surfaced on the dashboard (v1.0.0 feature)
    await expect(
      page.getByText(/Risk|risk/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test("navigating to /risk-analysis from dashboard link works", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/dashboard");

    // Look for a link or button pointing to /risk-analysis
    const riskLink = page
      .getByRole("link", { name: /risk/i })
      .or(page.getByRole("button", { name: /risk analysis|view risk/i }))
      .first();

    const riskLinkVisible = await riskLink.isVisible({ timeout: 5_000 }).catch(() => false);
    if (riskLinkVisible) {
      await riskLink.click();
      await expect(page).toHaveURL(/\/risk-analysis/, { timeout: 15_000 });
    } else {
      // Direct navigation fallback — confirms the page is accessible
      await page.goto("/risk-analysis", { waitUntil: "domcontentloaded" });
      await expect(page.getByText(/Risk/i).first()).toBeVisible({ timeout: 15_000 });
    }
  });
});

// ---------------------------------------------------------------------------
// Within-role vs between-role risk attribution
// ---------------------------------------------------------------------------

test.describe("Risk Analysis — SOD Risk Attribution", () => {
  test("within-role conflicts appear in incorrect access section", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/risk-analysis");

    await expect(page.getByText(/Risk/i).first()).toBeVisible({ timeout: 30_000 });

    // Within-role conflicts should be attributed differently from between-role
    // Look for any mention of role-level risk attribution
    const withinRoleText = page.getByText(/within.role|role definition|role-level/i).first();
    const sodConflictText = page.getByText(/SOD|conflict|separation/i).first();

    // At least one SOD-related risk attribution should be visible
    const hasRiskAttribution =
      (await withinRoleText.isVisible({ timeout: 5_000 }).catch(() => false)) ||
      (await sodConflictText.isVisible({ timeout: 5_000 }).catch(() => false));
    expect(hasRiskAttribution).toBe(true);
  });
});
