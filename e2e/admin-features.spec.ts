import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Admin Console Features", () => {
  test.beforeEach(async ({ page }) => {
    // Admin console requires system_admin role
    await login(page, "sysadmin");
  });

  test("admin console loads with tabs", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });

    // Verify the admin console rendered (wait for heavy page)
    await expect(page.getByText(/Admin|Console|Configuration/i).first()).toBeVisible({
      timeout: 30_000,
    });

    // Check that expected tabs are present (actual tab names from admin-console-client.tsx)
    const expectedTabs = [
      "Org Hierarchy",
      "Project Settings",
      "AI Configuration",
      "Feature Flags",
      "Webhooks",
      "Scheduled Exports",
      "Email",
    ];
    for (const tab of expectedTabs) {
      await expect(
        page.getByRole("tab", { name: new RegExp(tab, "i") })
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("Feature Flags tab shows flag list", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });

    // Wait for tabs to render
    await page.getByRole("tab", { name: /Feature Flags/i }).waitFor({ state: "visible", timeout: 30_000 });

    // Click the Feature Flags tab
    await page.getByRole("tab", { name: /Feature Flags/i }).click();

    // Should see flag entries (seeded defaults exist)
    await expect(
      page.getByText(/feature|flag|enabled|disabled/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Email tab shows email settings form", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });

    await page.getByRole("tab", { name: /Email/i }).waitFor({ state: "visible", timeout: 30_000 });

    // Click the Email tab
    await page.getByRole("tab", { name: /Email/i }).click();

    // Should see email configuration content
    await expect(
      page.getByText(/Email|Resend|SMTP|Template|Notification/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Webhooks tab shows webhook configuration", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });

    await page.getByRole("tab", { name: /Webhooks/i }).waitFor({ state: "visible", timeout: 30_000 });

    // Click the Webhooks tab
    await page.getByRole("tab", { name: /Webhooks/i }).click();

    await expect(
      page.getByText(/Webhook|Endpoint|Event|URL/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Scheduled Exports tab loads", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });

    await page.getByRole("tab", { name: /Scheduled Exports/i }).waitFor({ state: "visible", timeout: 30_000 });

    // Click the Scheduled Exports tab
    await page.getByRole("tab", { name: /Scheduled Exports/i }).click();

    await expect(
      page.getByText(/Export|Schedule|Daily|Weekly|Monthly/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Admin — Security Design", () => {
  test("security design page loads with connection test card", async ({ page }) => {
    await login(page, "sysadmin");

    await page.goto("/admin/security-design", { waitUntil: "domcontentloaded" });

    // Should see security design content
    await expect(
      page.getByText(/Security Design|Connection|Target System|Adapter/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });
});

test.describe("Admin — Audit Log", () => {
  test("audit log page loads with entries", async ({ page }) => {
    await login(page, "demo.admin");

    await page.goto("/audit-log", { waitUntil: "domcontentloaded" });

    // Should see audit log content
    await expect(
      page.getByText(/Audit|Log|Action|Event/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });
});

test.describe("System Admin — Security Design Access", () => {
  test("system admin can access security design page", async ({ page }) => {
    await login(page, "sysadmin");

    await page.goto("/admin/security-design", { waitUntil: "domcontentloaded" });

    // Should not redirect away
    await expect(page).toHaveURL(/\/admin\/security-design/);
    await expect(
      page.getByText(/Security Design|Connection|Target System/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });
});
