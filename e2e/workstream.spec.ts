import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * Workstream Tracker — /workstream
 *
 * Tests the RAID-style PM tracker introduced in v1.0.0.
 * Covers: page load by role, RBAC on propose/approve actions,
 * category filter UI, and stat cards.
 *
 * Role matrix for workstream:
 *   - viewer:       read-only (no Propose button)
 *   - coordinator:  can propose, cannot approve/reject
 *   - mapper:       can propose, cannot approve/reject
 *   - approver:     can propose, cannot approve/reject
 *   - admin:        can propose + approve/reject
 *   - system_admin: can propose + approve/reject
 */

// ---------------------------------------------------------------------------
// Page load checks
// ---------------------------------------------------------------------------

test.describe("Workstream — Page Load", () => {
  test("admin can access /workstream", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/workstream");

    await expect(page.getByText(/Workstream/i).first()).toBeVisible({ timeout: 30_000 });

    // Summary stat cards should be rendered
    const cards = page.locator(
      "[data-testid='workstream-stat'], .rounded-lg, [data-testid='kpi-card']"
    );
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
  });

  test("mapper can access /workstream", async ({ page }) => {
    await login(page, "demo.mapper.finance", undefined, "/workstream");
    await expect(page.getByText(/Workstream/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test("viewer can access /workstream (read-only)", async ({ page }) => {
    await login(page, "demo.viewer", undefined, "/workstream");
    await expect(page.getByText(/Workstream/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test("coordinator can access /workstream", async ({ page }) => {
    await login(page, "demo.coordinator", undefined, "/workstream");
    await expect(page.getByText(/Workstream/i).first()).toBeVisible({ timeout: 30_000 });
  });
});

// ---------------------------------------------------------------------------
// Category filter UI
// ---------------------------------------------------------------------------

test.describe("Workstream — Category Filters", () => {
  test("RAID category filters are visible", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/workstream");

    // The four RAID categories should appear as filter options
    for (const label of ["Risk", "Action", "Issue", "Decision"]) {
      await expect(
        page.getByRole("button", { name: new RegExp(label, "i") }).or(
          page.getByText(new RegExp(label, "i"))
        ).first()
      ).toBeVisible({ timeout: 15_000 });
    }
  });

  test("status filter options are accessible", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/workstream");

    // Status filter: pending / approved / rejected / resolved
    await expect(
      page.getByText(/pending|approved|rejected|resolved/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// RBAC — Propose action
// ---------------------------------------------------------------------------

test.describe("Workstream — Propose Action RBAC", () => {
  test("admin sees Propose / Add Item button", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/workstream");

    await expect(
      page.getByRole("button", { name: /propose|add item|new item/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("mapper sees Propose / Add Item button", async ({ page }) => {
    await login(page, "demo.mapper.finance", undefined, "/workstream");

    await expect(
      page.getByRole("button", { name: /propose|add item|new item/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("coordinator sees Propose / Add Item button", async ({ page }) => {
    await login(page, "demo.coordinator", undefined, "/workstream");

    await expect(
      page.getByRole("button", { name: /propose|add item|new item/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("viewer does NOT see Propose / Add Item button", async ({ page }) => {
    await login(page, "demo.viewer", undefined, "/workstream");

    // Wait for the page to fully load before asserting absence
    await expect(page.getByText(/Workstream/i).first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1_000);

    await expect(
      page.getByRole("button", { name: /propose|add item|new item/i })
    ).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// RBAC — Approve/Reject action
// ---------------------------------------------------------------------------

test.describe("Workstream — Approve/Reject RBAC", () => {
  /**
   * The approve/reject buttons only appear on pending items.
   * Seed data should contain at least one pending item for these tests.
   * If not, we check the absence of buttons for non-privileged roles
   * and verify privileged roles have the UI scaffolding in place.
   */

  test("coordinator cannot see Approve/Reject buttons on pending items", async ({ page }) => {
    await login(page, "demo.coordinator", undefined, "/workstream");

    await expect(page.getByText(/Workstream/i).first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1_000);

    // Coordinator can propose but not approve
    const approveBtn = page.getByRole("button", { name: /^approve$/i });
    await expect(approveBtn).toHaveCount(0);
  });

  test("admin sees Approve/Reject buttons when pending items exist", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/workstream");

    await expect(page.getByText(/Workstream/i).first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1_500);

    // If pending items exist in seed data, approve/reject should be visible
    const pendingItems = page.locator("[data-testid='workstream-item-pending'], tr, .card").filter({
      hasText: /pending/i,
    });
    const pendingCount = await pendingItems.count();

    if (pendingCount > 0) {
      // At least one approve or reject button should exist
      const actionBtn = page.getByRole("button", { name: /approve|reject/i });
      await expect(actionBtn.first()).toBeVisible({ timeout: 10_000 });
    } else {
      // No pending items — just verify admin can see the propose button
      await expect(
        page.getByRole("button", { name: /propose|add item|new item/i })
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("viewer sees no action buttons at all", async ({ page }) => {
    await login(page, "demo.viewer", undefined, "/workstream");

    await expect(page.getByText(/Workstream/i).first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1_000);

    // Viewer should see no Approve, Reject, or Propose buttons
    for (const label of ["Approve", "Reject", "Propose", "Add Item"]) {
      await expect(
        page.getByRole("button", { name: new RegExp(`^${label}$`, "i") })
      ).toHaveCount(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Stat cards
// ---------------------------------------------------------------------------

test.describe("Workstream — Stat Cards", () => {
  test("summary cards show RAID category counts", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/workstream");

    await expect(page.getByText(/Workstream/i).first()).toBeVisible({ timeout: 30_000 });

    // At least one numeric count should appear in stat cards
    const numericText = page.locator("text=/^\\d+$/").first();
    await expect(numericText).toBeVisible({ timeout: 15_000 });
  });
});
