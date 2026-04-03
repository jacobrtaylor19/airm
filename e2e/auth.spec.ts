import { test, expect } from "@playwright/test";
import { login, loginViaForm } from "./helpers/auth";

test.describe("Authentication", () => {
  test("login with valid credentials redirects to dashboard", async ({ page }) => {
    await loginViaForm(page, "demo.admin");

    await expect(page).toHaveURL(/\/dashboard/);
    // The sidebar brand should be visible once logged in
    await expect(page.getByText("Provisum").first()).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    const usernameInput = page.getByPlaceholder("Enter your username");
    await usernameInput.waitFor({ state: "visible", timeout: 30_000 });

    // Click first to ensure React hydration has attached event handlers
    await usernameInput.click();
    await usernameInput.fill("baduser");
    await page.getByPlaceholder("Enter your password").fill("wrongpassword");

    // Wait for React state to enable the button
    await expect(page.getByRole("button", { name: "Sign In" })).toBeEnabled({ timeout: 10_000 });
    await page.getByRole("button", { name: "Sign In" }).click();

    // The form shows an inline error message (text-destructive paragraph)
    await expect(page.locator("p.text-destructive, .text-destructive")).toBeVisible({
      timeout: 10_000,
    });

    // Should stay on the login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthorized access redirects to login", async ({ browser }) => {
    // Use a fresh context with no cookies to ensure no session leaks
    const context = await browser.newContext();
    const page = await context.newPage();

    // Try to visit dashboard without logging in
    await page.goto("/dashboard", { waitUntil: "commit" });

    // Middleware should redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });

    await context.close();
  });

  test("viewer cannot access /admin", async ({ page }) => {
    await login(page, "demo.viewer");

    // Navigate to admin page
    await page.goto("/admin", { waitUntil: "domcontentloaded" });

    // Should be redirected away — either to /unauthorized or /dashboard
    await expect(page).not.toHaveURL(/\/admin$/, { timeout: 10_000 });
  });
});
