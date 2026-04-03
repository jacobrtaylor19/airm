import { type Page, type BrowserContext, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

/** Default passwords by username — non-demo users have unique passwords */
const PASSWORDS: Record<string, string> = {
  sysadmin: "Sysadmin@2026!",
  admin: "AdminPass@2026!",
};

const AUTH_DIR = path.join(__dirname, "..", ".auth");

/**
 * Log in using pre-saved storage state from global setup.
 * Falls back to API login if no saved state exists.
 *
 * @param navigateTo - Target page to navigate to after login (default: "/dashboard").
 *   Set to `false` to skip navigation entirely (just loads cookies).
 */
export async function login(
  page: Page,
  username: string,
  password?: string,
  navigateTo: string | false = "/dashboard",
) {
  const stateFile = path.join(AUTH_DIR, `${username}.json`);

  if (fs.existsSync(stateFile)) {
    // Load saved cookies into the browser context
    const context = page.context();
    const state = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
    if (state.cookies?.length) {
      await context.addCookies(state.cookies);
    }

    if (navigateTo === false) return;

    // Navigate to the target page
    await page.goto(navigateTo, { waitUntil: "commit", timeout: 90_000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 45_000 }).catch(() => {});

    // If redirected to login, the session expired — fall back to API login
    if (page.url().includes("/login")) {
      await loginViaAPI(page, username, password);
      if (navigateTo !== "/dashboard") {
        await page.goto(navigateTo, { waitUntil: "domcontentloaded" });
      }
    }
    return;
  }

  await loginViaAPI(page, username, password);
  if (navigateTo && navigateTo !== "/dashboard") {
    await page.goto(navigateTo, { waitUntil: "domcontentloaded" });
  }
}

/**
 * Log in via API call and navigate to dashboard.
 * Retries once on timeout/network errors (dev server can be slow under load).
 */
async function loginViaAPI(
  page: Page,
  username: string,
  password?: string,
) {
  const pw = password ?? PASSWORDS[username] ?? "DemoGuide2026!";

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
      const response = await page.request.post(`${baseURL}/api/auth/login`, {
        data: { username, password: pw },
        timeout: 60_000,
      });

      if (!response.ok()) {
        throw new Error(`Login failed for ${username}: ${response.status()} ${await response.text()}`);
      }

      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      await page.waitForURL("**/dashboard", { timeout: 45_000 });
      return;
    } catch (err) {
      if (attempt === 0 && err instanceof Error && /timeout|ECONNREFUSED|ECONNRESET/i.test(err.message)) {
        // Dev server may be under load — wait a moment and retry
        await page.waitForTimeout(3_000);
        continue;
      }
      throw err;
    }
  }
}

/**
 * Log in via the login form UI — use this only for tests that specifically
 * test the login form behavior.
 */
export async function loginViaForm(
  page: Page,
  username: string,
  password?: string,
) {
  const pw = password ?? PASSWORDS[username] ?? "DemoGuide2026!";
  await page.goto("/login", { waitUntil: "networkidle" });

  const usernameInput = page.getByPlaceholder("Enter your username");
  await usernameInput.waitFor({ state: "visible", timeout: 45_000 });

  // Click first to ensure React hydration has attached event handlers
  await usernameInput.click();
  await usernameInput.fill(username);
  await page.getByPlaceholder("Enter your password").fill(pw);

  // Wait for React state to update before clicking submit
  await expect(page.getByRole("button", { name: "Sign In" })).toBeEnabled({ timeout: 15_000 });
  await page.getByRole("button", { name: "Sign In" }).click();

  await page.waitForURL("**/dashboard", { timeout: 45_000 });
}
