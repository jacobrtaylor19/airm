import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { validatePassword } from "@/lib/password-policy";
import { validateBody } from "@/lib/validation";
import { setupSchema } from "@/lib/validation/auth";
import { safeError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Only allow setup if no users exist
    const existing = await db.select().from(schema.appUsers).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Setup already completed" }, { status: 400 });
    }

    const body = await req.json();
    const validation = validateBody(setupSchema, body);
    if (!validation.success) return validation.response;
    const { username, displayName, password } = validation.data;

    // Validate password strength
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return NextResponse.json(
        { error: "Password does not meet requirements", details: pwCheck.errors },
        { status: 400 }
      );
    }

    // Create the Supabase Auth user via admin API
    const supabaseAdmin = createAdminClient();
    const email = `${username}@provisum.demo`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: `Failed to create auth user: ${authError?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    // Create the app user with link to Supabase Auth
    await db.insert(schema.appUsers).values({
      organizationId: 1,
      username,
      displayName,
      email,
      passwordHash: "", // Not used with Supabase Auth
      role: "admin",
      supabaseAuthId: authData.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = safeError(err, "Setup failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
