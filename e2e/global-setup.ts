import { request } from "@playwright/test";
import path from "path";
import fs from "fs";

/** Default passwords by username — non-demo users have unique passwords */
const PASSWORDS: Record<string, string> = {
  sysadmin: "Sysadmin@2026!",
  admin: "AdminPass@2026!",
};

/** All users used across E2E tests */
const TEST_USERS = [
  "demo.admin",
  "demo.mapper.finance",
  "demo.approver",
  "demo.viewer",
  "demo.coordinator",
  "sysadmin",
];

const AUTH_DIR = path.join(__dirname, ".auth");

/**
 * Global setup: logs in each test user once and saves their cookies
 * as storage state files. Tests load these instead of logging in each time.
 */
async function globalSetup() {
  // Ensure auth directory exists
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const baseURL = "http://localhost:3000";

  for (const username of TEST_USERS) {
    const pw = PASSWORDS[username] ?? "DemoGuide2026!";
    const stateFile = path.join(AUTH_DIR, `${username}.json`);

    const ctx = await request.newContext({ baseURL });
    try {
      const response = await ctx.post("/api/auth/login", {
        data: { username, password: pw },
        timeout: 30_000,
      });

      if (!response.ok()) {
        console.warn(`Login failed for ${username}: ${response.status()}`);
        continue;
      }

      // Save the storage state (cookies) to a file
      await ctx.storageState({ path: stateFile });
      console.log(`  ✓ Authenticated ${username}`);
    } catch (err) {
      console.warn(`Login error for ${username}:`, err);
    } finally {
      await ctx.dispose();
    }
  }
}

export default globalSetup;
