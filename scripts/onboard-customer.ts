/**
 * Customer Onboarding Script
 *
 * Creates a new organization with an admin user in the production database.
 *
 * Usage:
 *   DATABASE_URL=<prod> NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \
 *     pnpm tsx scripts/onboard-customer.ts \
 *       --org="Acme Corp" \
 *       --admin-email="admin@acme.com" \
 *       --admin-name="Jane Admin" \
 *       --region="us-east-1"
 *
 * What it does:
 * 1. Creates the organization
 * 2. Creates a default program + Phase 1 release
 * 3. Creates the admin user (Supabase Auth + app_users)
 * 4. Seeds default feature flags
 * 5. Prints login credentials
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name: string): string | null {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split("=").slice(1).join("=") : null;
}

const orgName = getArg("org");
const adminEmail = getArg("admin-email");
const adminName = getArg("admin-name") || "Admin";

if (!orgName || !adminEmail) {
  console.error("Usage: pnpm tsx scripts/onboard-customer.ts --org=\"Acme Corp\" --admin-email=\"admin@acme.com\" [--admin-name=\"Jane Admin\"]");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!connectionString || !supabaseUrl || !supabaseServiceKey) {
  console.error("Required env vars: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

async function main() {
  const client = postgres(connectionString!, { max: 1, prepare: false });
  const db = drizzle(client, { schema });
  const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

  console.log(`\nOnboarding: ${orgName}`);
  console.log(`Admin: ${adminName} <${adminEmail}>\n`);

  // 1. Create organization
  const orgSlug = orgName!.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const [org] = await db.insert(schema.organizations).values({
    name: orgName!,
    slug: orgSlug,
  }).returning();
  console.log(`[1/5] Organization created: ${org.name} (ID: ${org.id})`);

  // 2. Create default program + release
  // Note: programs table may not exist yet in current schema — create release directly
  const [release] = await db.insert(schema.releases).values({
    organizationId: org.id,
    name: "Phase 1",
    description: `Initial migration release for ${orgName}`,
    status: "planning",
    releaseType: "initial",
    isActive: true,
    createdBy: adminEmail!,
  }).returning();
  console.log(`[2/5] Release created: ${release.name} (ID: ${release.id})`);

  // 3. Create Supabase Auth user
  const tempPassword = `Provisum@${crypto.randomBytes(4).toString("hex")}`;
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail!,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    console.error(`Failed to create auth user: ${authError?.message}`);
    process.exit(1);
  }
  console.log(`[3/5] Auth user created: ${authData.user.id}`);

  // 4. Create app_users row
  const username = adminEmail!.split("@")[0];
  await db.insert(schema.appUsers).values({
    organizationId: org.id,
    username,
    displayName: adminName!,
    email: adminEmail!,
    passwordHash: "",
    role: "system_admin",
    supabaseAuthId: authData.user.id,
  });
  console.log(`[4/5] App user created: ${username} (system_admin)`);

  // 5. Seed default feature flags for this org
  const defaultFlags = [
    { key: "ai_suggestions", enabled: true },
    { key: "lumen_chat", enabled: true },
    { key: "evidence_package", enabled: true },
    { key: "sso_login", enabled: false },
    { key: "scheduled_exports", enabled: true },
  ];
  for (const flag of defaultFlags) {
    await db.insert(schema.featureFlags).values({
      key: flag.key,
      enabled: flag.enabled,
      description: `Default flag: ${flag.key}`,
    }).onConflictDoNothing();
  }
  console.log(`[5/5] Feature flags seeded`);

  // Done
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Customer onboarded successfully!`);
  console.log(`${"=".repeat(50)}`);
  console.log(`Organization: ${orgName} (ID: ${org.id})`);
  console.log(`Admin login:  ${username}`);
  console.log(`Temp password: ${tempPassword}`);
  console.log(`URL: https://app.provisum.io/login`);
  console.log(`\nIMPORTANT: Share the temp password securely and ask the admin to change it on first login.\n`);

  await client.end();
}

main().catch((err) => {
  console.error("Onboarding failed:", err);
  process.exit(1);
});
