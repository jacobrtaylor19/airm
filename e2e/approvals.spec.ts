import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Approvals", () => {
  test("approver sees the approval queue", async ({ page }) => {
    await login(page, "demo.approver", undefined, "/approvals");

    // The approvals page should render content
    await expect(page.getByText(/Approval/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("viewer has read-only access (no action buttons on approvals)", async ({ page }) => {
    await login(page, "demo.viewer", undefined, "/approvals");

    // Page should load
    await expect(page.getByText(/Approval/i).first()).toBeVisible({ timeout: 15_000 });

    // Viewer should NOT see approve/reject action buttons
    // Check that there are no Approve or Reject buttons visible
    const approveBtn = page.getByRole("button", { name: /Approve/i });
    const rejectBtn = page.getByRole("button", { name: /Reject/i });

    await expect(approveBtn).toHaveCount(0);
    await expect(rejectBtn).toHaveCount(0);
  });
});
