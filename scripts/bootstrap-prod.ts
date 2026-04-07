/**
 * Production Bootstrap Script
 *
 * Creates the minimal structure for provisum-prod:
 * - 1 organization (Provisum)
 * - 1 release
 * - 1 admin user (Jacob)
 * - Default feature flags
 * - NO demo accounts, NO seed data
 *
 * Usage:
 *   DATABASE_URL=<prod> NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \
 *     pnpm tsx scripts/bootstrap-prod.ts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const connectionString = process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!connectionString || !supabaseUrl || !supabaseServiceKey) {
  console.error("Required: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Safety: verify this is the prod Supabase project
const PROD_REF = "sfwecmjbqhurglcdsmbb";
if (!connectionString.includes(PROD_REF)) {
  console.error(`FATAL: DATABASE_URL does not contain prod project ref (${PROD_REF}).`);
  console.error("This script must only run against provisum-prod.");
  process.exit(1);
}

const ADMIN_EMAIL = "hello@provisum.io";
const ADMIN_NAME = "Jacob Taylor";

async function main() {
  const client = postgres(connectionString!, { max: 1, prepare: false });
  const db = drizzle(client, { schema });
  const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

  console.log("\nBootstrapping provisum-prod...\n");

  // 1. Create organization
  const [org] = await db.insert(schema.organizations).values({
    name: "Provisum",
    slug: "provisum",
  }).onConflictDoNothing().returning();
  const orgId = org?.id ?? 1;
  console.log(`[1/4] Organization: Provisum (ID: ${orgId})`);

  // 2. Create default release
  await db.insert(schema.releases).values({
    organizationId: orgId,
    name: "Default",
    description: "Default release",
    status: "planning",
    releaseType: "initial",
    isActive: true,
    createdBy: ADMIN_EMAIL,
  }).onConflictDoNothing();
  console.log(`[2/4] Release: Default`);

  // 3. Create admin user
  const tempPassword = `Provisum@${crypto.randomBytes(4).toString("hex")}`;
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message?.includes("already been registered")) {
      console.log(`[3/4] Admin user already exists — skipping`);
    } else {
      console.error(`Failed to create admin: ${authError.message}`);
      process.exit(1);
    }
  } else {
    await db.insert(schema.appUsers).values({
      organizationId: orgId,
      username: "jacob",
      displayName: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash: "",
      role: "system_admin",
      supabaseAuthId: authData.user!.id,
    });
    console.log(`[3/4] Admin: jacob (${ADMIN_EMAIL})`);
    console.log(`       Temp password: ${tempPassword}`);
  }

  // 4. Default feature flags
  const flags = [
    { key: "ai_suggestions", enabled: true, description: "AI mapping suggestions" },
    { key: "lumen_chat", enabled: true, description: "Lumen AI chatbot" },
    { key: "evidence_package", enabled: true, description: "SOX evidence package export" },
    { key: "sso_login", enabled: false, description: "SSO authentication" },
    { key: "scheduled_exports", enabled: true, description: "Scheduled export jobs" },
  ];
  for (const flag of flags) {
    await db.insert(schema.featureFlags).values(flag).onConflictDoNothing();
  }
  console.log(`[4/4] Feature flags seeded`);

  console.log(`\n${"=".repeat(50)}`);
  console.log(`provisum-prod bootstrapped!`);
  console.log(`${"=".repeat(50)}`);
  console.log(`Login: jacob / ${tempPassword}`);
  console.log(`URL: https://app.provisum.io/login\n`);

  await client.end();
}

main().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
