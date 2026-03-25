import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { validatePassword } from "@/lib/password-policy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Only allow setup if no users exist
    const existing = db.select().from(schema.appUsers).limit(1).all();
    if (existing.length > 0) {
      return NextResponse.json({ error: "Setup already completed" }, { status: 400 });
    }

    const { username, displayName, password } = await req.json();
    if (!username || !displayName || !password) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    // Validate password strength
    const validation = validatePassword(password);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Password does not meet requirements", details: validation.errors },
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
