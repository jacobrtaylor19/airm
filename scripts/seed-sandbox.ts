/**
 * Sandbox Environment Seed Script
 *
 * Creates the minimal structure needed for a sandbox:
 * - 1 organization
 * - 1 release
 * - 8 persona login accounts (same as demo)
 * - Default feature flags
 * - NO business data (users, personas, mappings, SOD rules, etc.)
 *
 * Usage:
 *   DATABASE_URL=<sandbox> NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \
 *     pnpm tsx scripts/seed-sandbox.ts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";
import { createClient } from "@supabase/supabase-js";

const connectionString = process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!connectionString || !supabaseUrl || !supabaseServiceKey) {
  console.error("Required: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const DEMO_PASSWORD = "DemoGuide2026!";

const PERSONA_ACCOUNTS = [
  { username: "demo.admin", displayName: "Demo Administrator", role: "admin" },
  { username: "demo.mapper.finance", displayName: "Demo Mapper (Finance)", role: "mapper" },
  { username: "demo.mapper.operations", displayName: "Demo Mapper (Operations)", role: "mapper" },
  { username: "demo.approver", displayName: "Demo Approver", role: "approver" },
  { username: "demo.viewer", displayName: "Demo Viewer", role: "viewer" },
  { username: "demo.coordinator", displayName: "Demo Coordinator", role: "coordinator" },
  { username: "demo.pm", displayName: "Demo Project Manager", role: "project_manager" },
  { username: "demo.compliance", displayName: "Demo Compliance Officer", role: "compliance_officer" },
  { username: "demo.security", displayName: "Demo Security Architect", role: "security_architect" },
];

async function main() {
  const client = postgres(connectionString!, { max: 1, prepare: false });
  const db = drizzle(client, { schema });
  const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

  console.log("\nSeeding sandbox environment...\n");

  // 1. Create organization
  const [org] = await db.insert(schema.organizations).values({
    name: "Sandbox",
    slug: "sandbox",
  }).onConflictDoNothing().returning();
  const orgId = org?.id ?? 1;
  console.log(`[1/4] Organization: Sandbox (ID: ${orgId})`);

  // 2. Create default release
  await db.insert(schema.releases).values({
    organizationId: orgId,
    name: "Evaluation",
    description: "Sandbox evaluation release",
    status: "planning",
    releaseType: "initial",
    isActive: true,
    createdBy: "sandbox-seed",
  }).onConflictDoNothing();
  console.log(`[2/4] Release: Evaluation`);

  // 3. Create persona login accounts
  let created = 0;
  for (const persona of PERSONA_ACCOUNTS) {
    const email = `${persona.username}@provisum.local`;

    // Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });

    if (authError) {
      // May already exist
      if (authError.message?.includes("already been registered")) {
        console.log(`   ${persona.username} — already exists, skipping`);
        continue;
      }
      console.error(`   ${persona.username} — failed: ${authError.message}`);
      continue;
    }

    await db.insert(schema.appUsers).values({
      organizationId: orgId,
      username: persona.username,
      displayName: persona.displayName,
      email,
      passwordHash: "",
      role: persona.role,
      supabaseAuthId: authData.user!.id,
    }).onConflictDoNothing();

    created++;
    console.log(`   ${persona.username} (${persona.role})`);
  }
  console.log(`[3/4] Created ${created} persona accounts`);

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
  console.log(`Sandbox seeded successfully!`);
  console.log(`${"=".repeat(50)}`);
  console.log(`All accounts use password: ${DEMO_PASSWORD}`);
  console.log(`No business data — prospect uploads their own.\n`);

  await client.end();
}

main().catch((err) => {
  console.error("Sandbox seed failed:", err);
  process.exit(1);
});
