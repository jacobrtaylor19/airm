import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser, verifyPassword, hashPassword } from "@/lib/auth";
import { validatePassword } from "@/lib/password-policy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    // Get the user's current password hash
    const appUser = db
      .select({ passwordHash: schema.appUsers.passwordHash })
      .from(schema.appUsers)
      .where(eq(schema.appUsers.id, user.id))
      .get();

    if (!appUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isCurrentValid = await verifyPassword(currentPassword, appUser.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    // Validate new password strength
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "New password does not meet requirements", details: validation.errors },
        { status: 400 }
      );
    }

    // Hash and update
    const newHash = await hashPassword(newPassword);
    db.update(schema.appUsers)
      .set({ passwordHash: newHash, updatedAt: new Date().toISOString() })
      .where(eq(schema.appUsers.id, user.id))
      .run();

    // Audit log the change (no password values)
    db.insert(schema.auditLog)
      .values({
        entityType: "auth",
        entityId: user.id,
        action: "password_changed",
        actorEmail: user.email || user.username,
      })
      .run();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message =
      process.env.NODE_ENV === "development" && err instanceof Error
        ? err.message
        : "Failed to change password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
