import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Inbox / Notifications", () => {
  test("coordinator can access inbox page", async ({ page }) => {
    await login(page, "demo.coordinator", undefined, "/inbox");

    // Should see inbox/notification content
    await expect(
      page.getByText(/Inbox|Notification|Message/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // Should not be redirected away
    await expect(page).toHaveURL(/\/inbox/);
  });

  test("sidebar shows Inbox link", async ({ page }) => {
    await login(page, "demo.coordinator");

    // After login we are on the dashboard — check sidebar for Inbox link
    const inboxLink = page.getByRole("link", { name: /Inbox/i });
    await expect(inboxLink).toBeVisible({ timeout: 10_000 });
  });

  test("admin can access inbox page", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/inbox");

    await expect(
      page.getByText(/Inbox|Notification|Message/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
