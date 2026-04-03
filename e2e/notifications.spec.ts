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

  test("coordinator can navigate to inbox directly", async ({ page }) => {
    await login(page, "demo.coordinator", undefined, "/inbox");

    // Should land on the inbox page without being redirected away
    await expect(page).toHaveURL(/\/inbox/);

    // Should see inbox/notification content
    await expect(
      page.getByText(/Inbox|Notification|Message/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("admin can access inbox page", async ({ page }) => {
    await login(page, "demo.admin", undefined, "/inbox");

    await expect(
      page.getByText(/Inbox|Notification|Message/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
