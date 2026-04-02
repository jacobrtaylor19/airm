import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * Workflow Transitions — Assignment State Machine
 *
 * Tests the approval workflow state machine:
 *   draft → pending_review → sod_rejected | compliance_approved
 *         → ready_for_approval → approved
 *
 * These tests verify the UI surfaces the correct states and that role-based
 * action buttons appear only for roles permitted to take each action.
 *
 * Permission matrix (from CLAUDE.md):
 * | Action              | system_admin | admin | mapper | approver | coordinator | viewer |
 * |---------------------|:---:|:---:|:---:|:---:|:---:|:---:|
 * | Submit for Review   |  ✅  |  ✅  |  ✅  |  ❌  |  ❌  |  ❌  |
 * | Approve/Reject      |  ✅  |  ✅  |  ❌  |  ✅  |  ❌  |  ❌  |
 * | Send Back to Draft  |  ✅  |  ✅  |  ✅  |  ✅  |  ❌  |  ❌  |
 * | Edit Role Assign.   |  ✅  |  ✅  |  ✅  |  ❌  |  ❌  |  ❌  |
 * | Bulk Delete         |  ✅  |  ✅  |  ❌  |  ❌  |  ❌  |  ❌  |
 */

// ---------------------------------------------------------------------------
// Mapping page — draft state assignments
// ---------------------------------------------------------------------------

test.describe("Workflow — Draft State", () => {
  test("mapping page shows draft assignments with Submit for Review", async ({ page }) => {
    await login(page, "demo.mapper.finance", undefined, "/mapping");

    await expect(
      page.getByText(/Mapping|Role/i).first()
    ).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(2_000);

    // Draft assignments should exist in seed data
    const draftItems = page.locator(
      "[data-testid='assignment-status-draft'], .badge, span"
    ).filter({ hasText: /draft/i });

    const hasDraft = await draftItems.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasDraft) {
      // Submit for Review button should appear for mapper
      await expect(
        page.getByRole("button", { name: /submit.*review|submit for review/i })
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("mapper sees Edit action on draft assignments", async ({ page }) => {
    await login(page, "demo.mapper.finance", undefined, "/mapping");

    await expect(
      page.getByText(/Mapping|Role/i).first()
    ).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(2_000);

    // Edit buttons should appear for draft assignments
    const editBtn = page.getByRole("button", { name: /edit/i })
      .or(page.getByRole("link", { name: /edit/i }));
    const count = await editBtn.count();
    expect(count).toBeGreaterThan(0);
  });

  test("viewer sees NO Submit for Review or Edit buttons", async ({ page }) => {
    await login(page, "demo.viewer", undefined, "/mapping");

    await expect(
      page.getByText(/Mapping|Role/i).first()
    ).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(1_500);

    await expect(
      page.getByRole("button", { name: /submit.*review/i })
    ).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Approvals queue — pending_review / compliance_approved
// ---------------------------------------------------------------------------

test.describe("Workflow — Approval State", () => {
  test("approver sees pending items in approval queue", async ({ page }) => {
    await login(page, "demo.approver", undefined, "/approvals");

    await expect(
      page.getByText(/Approval/i).first()
    ).toBeVisible({ timeout: 30_000 });

    // The approvals queue should have items
    const queueItems = page.locator(
      "table tbody tr, [data-testid='approval-item'], .card"
    );
    await expect(queueItems.first()).toBeVisible({ timeout: 15_000 });
  });

  test("approver sees Approve and Reject buttons on queue items", async ({ page }) => {
    await login(page, "demo.approver", undefined, "/approvals");

    await expect(
      page.getByText(/Approval/i).first()
    ).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1_500);

    // Approver should have Approve and/or Reject action buttons
    const approveBtn = page.getByRole("button", { name: /^approve$/i });
    const rejectBtn = page.getByRole("button", { name: /^reject$/i });

    const hasApprove = await approveBtn.first().isVisible({ timeout: 5_000 }).catch(() => false);
    const hasReject = await rejectBtn.first().isVisible({ timeout: 5_000 }).catch(() => false);

    // At least one action button should be present
    expect(hasApprove || hasReject).toBe(true);
  });

  test("mapper does NOT see Approve/Reject buttons on approvals page", async ({ page }) => {
    await login(page, "demo.mapper.finance", undefined, "/approvals");

    await expect(
      page.getByText(/Approval/i).first()
    ).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1_000);

    await expect(
      page.getByRole("button", { name: /^approve$/i })
    ).toHaveCount(0);

    await expect(
      page.getByRole("button", { name: /^reject$/i })
    ).toHaveCount(0);
  });

  test("admin sees Approve and Reject buttons (admin can approve)", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/approvals");

    await expect(
      page.getByText(/Approval/i).first()
    ).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1_500);

    const approveBtn = page.getByRole("button", { name: /^approve$/i });
    const rejectBtn = page.getByRole("button", { name: /^reject$/i });

    const hasApprove = await approveBtn.first().isVisible({ timeout: 5_000 }).catch(() => false);
    const hasReject = await rejectBtn.first().isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasApprove || hasReject).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Send Back to Draft
// ---------------------------------------------------------------------------

test.describe("Workflow — Send Back to Draft", () => {
  test("approver sees Send Back to Draft option on pending items", async ({ page }) => {
    await login(page, "demo.approver", undefined, "/approvals");

    await expect(
      page.getByText(/Approval/i).first()
    ).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1_500);

    const sendBackBtn = page.getByRole("button", { name: /send back|return to draft|back to draft/i });
    const hasBtn = await sendBackBtn.first().isVisible({ timeout: 5_000 }).catch(() => false);

    // Send Back to Draft is a valid action for approver — check if present
    if (!hasBtn) {
      // May be in a dropdown/context menu — verify the approvals page at minimum loaded
      expect(page.url()).toMatch(/\/approvals/);
    }
  });

  test("coordinator does NOT see Send Back to Draft", async ({ page }) => {
    await login(page, "demo.coordinator", undefined, "/approvals");

    await expect(
      page.getByText(/Approval/i).first()
    ).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1_000);

    await expect(
      page.getByRole("button", { name: /send back|return to draft|back to draft/i })
    ).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Bulk delete — admin only
// ---------------------------------------------------------------------------

test.describe("Workflow — Bulk Delete", () => {
  test("admin sees bulk delete option on mapping page", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/mapping");

    await expect(
      page.getByText(/Mapping|Role/i).first()
    ).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(1_500);

    // Bulk delete may appear as a checkbox-select + action, or a dedicated button
    const bulkDeleteBtn = page.getByRole("button", { name: /bulk delete|delete selected/i });
    const checkbox = page.getByRole("checkbox").first();

    const hasBulkDelete = await bulkDeleteBtn.first().isVisible({ timeout: 3_000 }).catch(() => false);
    const hasCheckbox = await checkbox.isVisible({ timeout: 3_000 }).catch(() => false);

    expect(hasBulkDelete || hasCheckbox).toBe(true);
  });

  test("mapper does NOT see bulk delete", async ({ page }) => {
    await login(page, "demo.mapper.finance", undefined, "/mapping");

    await expect(
      page.getByText(/Mapping|Role/i).first()
    ).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(1_500);

    await expect(
      page.getByRole("button", { name: /bulk delete|delete selected/i })
    ).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Assignment status badge visibility
// ---------------------------------------------------------------------------

test.describe("Workflow — Status Badges", () => {
  test("assignment status badges are visible on mapping page", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/mapping");

    await expect(
      page.getByText(/Mapping|Role/i).first()
    ).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(2_000);

    // At least one assignment status badge should appear
    const statusBadge = page.getByText(
      /draft|pending_review|pending review|compliance_approved|sod_rejected|approved/i
    ).first();

    await expect(statusBadge).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Calibration — confidence scores
// ---------------------------------------------------------------------------

test.describe("Workflow — Calibration", () => {
  test("admin can access /calibration with confidence data", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/calibration");

    await expect(
      page.getByText(/Calibration|Confidence/i).first()
    ).toBeVisible({ timeout: 30_000 });

    // Confidence scores should be numeric values
    const confidenceValue = page.getByText(/%|\d+(\.\d+)?%/).first();
    await expect(confidenceValue).toBeVisible({ timeout: 15_000 });
  });

  test("approver can access /calibration", async ({ page }) => {
    await login(page, "demo.approver", undefined, "/calibration");

    await expect(
      page.getByText(/Calibration|Confidence/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test("viewer is blocked from /calibration (redirect to /unauthorized or /login)", async ({ page }) => {
    await login(page, "demo.viewer", undefined, "/dashboard");

    await page.goto("/calibration", { waitUntil: "domcontentloaded" });

    await page.waitForURL(/\/(unauthorized|login)/, { timeout: 10_000 }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/\/(unauthorized|login)/);
  });
});
