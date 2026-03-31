import { test, expect } from "@playwright/test";

/**
 * Helper to fill login form fields reliably (waits for hydration).
 */
async function fillLoginForm(page: import("@playwright/test").Page, username: string, password: string) {
  const usernameInput = page.getByPlaceholder("Enter your username");
  await usernameInput.waitFor({ state: "visible", timeout: 30_000 });

  // Click to ensure React hydration has attached event handlers
  await usernameInput.click();
  await usernameInput.fill(username);
  await page.getByPlaceholder("Enter your password").fill(password);

  // Wait for React controlled state to update (button should enable)
  await expect(page.getByRole("button", { name: "Sign In" })).toBeEnabled({ timeout: 10_000 });
}

test.describe("Error States", () => {
  test("navigating to a non-existent page shows 404 or redirects to login", async ({ page }) => {
    await page.goto("/nonexistent-page-xyz", { waitUntil: "domcontentloaded" });

    const url = page.url();
    const is404 = await page.getByText(/404|not found|page not found/i).isVisible().catch(() => false);
    const isLogin = url.includes("/login");

    // Either a proper 404 page or a redirect to login is acceptable
    expect(is404 || isLogin).toBe(true);
  });

  test("Sign In button is disabled when credentials are empty", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Sign In" }).waitFor({ state: "visible", timeout: 30_000 });

    // The Sign In button should be disabled when no fields are filled
    await expect(page.getByRole("button", { name: "Sign In" })).toBeDisabled();
  });

  test("Sign In button is disabled with only password filled", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    const passwordInput = page.getByPlaceholder("Enter your password");
    await passwordInput.waitFor({ state: "visible", timeout: 30_000 });

    // Click to trigger hydration, then fill only the password
    await passwordInput.click();
    await passwordInput.fill("SomePassword1!");

    // Button should still be disabled (no username)
    await expect(page.getByRole("button", { name: "Sign In" })).toBeDisabled();
  });

  test("login with wrong password shows error", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });

    await fillLoginForm(page, "demo.admin", "WrongPassword123!");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Should show error and stay on login
    await expect(page.locator("p.text-destructive, .text-destructive")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page).toHaveURL(/\/login/);
  });

  test("repeated failed attempts show error each time", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });

    // First attempt — fills form from scratch
    await fillLoginForm(page, "demo.viewer", "BadPassword0");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.locator("p.text-destructive, .text-destructive")).toBeVisible({
      timeout: 10_000,
    });

    // Second and third attempts — re-fill and submit
    for (let i = 1; i < 3; i++) {
      await page.getByPlaceholder("Enter your username").fill("demo.viewer");
      await page.getByPlaceholder("Enter your password").fill("BadPassword" + i);
      await page.waitForTimeout(300);
      await page.getByRole("button", { name: "Sign In" }).click();

      await expect(page.locator("p.text-destructive, .text-destructive")).toBeVisible({
        timeout: 10_000,
      });
    }

    // After multiple failed attempts, should still show an error and stay on login
    const errorText = await page.locator("p.text-destructive, .text-destructive").textContent();
    expect(errorText?.toLowerCase()).toMatch(/invalid|credentials|error|failed/);
    await expect(page).toHaveURL(/\/login/);
  });
});
