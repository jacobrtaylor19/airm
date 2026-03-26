import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { validatePassword } from "@/lib/password-policy";
import { validateBody } from "@/lib/validation";
import { setupSchema } from "@/lib/validation/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Only allow setup if no users exist
    const existing = db.select().from(schema.appUsers).limit(1).all();
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

    const passwordHash = await hashPassword(password);

    db.insert(schema.appUsers).values({
      username,
      displayName,
      passwordHash,
      role: "admin",
    }).run();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message =
      process.env.NODE_ENV === "development" && err instanceof Error
        ? err.message
        : "Setup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
