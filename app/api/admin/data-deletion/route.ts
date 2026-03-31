import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { safeError } from "@/lib/errors";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * GDPR Article 17 — Right to Erasure.
 * Anonymizes PII for a given app user while preserving structural data.
 * Does NOT delete audit log entries (legal retention requirement).
 */
export async function POST(req: NextRequest) {
  const actor = await getSessionUser();
  if (!actor || actor.role !== "system_admin") {
    return NextResponse.json({ error: "Unauthorized — system_admin role required" }, { status: 403 });
  }

  try {
    const { userId, confirm } = await req.json();
    if (!userId || typeof userId !== "number") {
      return NextResponse.json({ error: "userId (number) is required" }, { status: 400 });
    }
    if (confirm !== true) {
      return NextResponse.json(
        { error: "Set confirm: true to proceed with data deletion" },
        { status: 400 }
      );
    }

    // Prevent self-deletion
    if (userId === actor.id) {
      return NextResponse.json({ error: "Cannot delete your own account data" }, { status: 400 });
    }

    const [appUser] = await db.select().from(schema.appUsers).where(eq(schema.appUsers.id, userId)).limit(1);
    if (!appUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const anonymizedId = crypto.randomBytes(4).toString("hex");
    const anonymizedName = `DELETED_USER_${anonymizedId}`;
    const anonymizedEmail = `deleted_${anonymizedId}@anonymized.local`;

    // Anonymize the app user record
    await db.update(schema.appUsers)
      .set({
        username: anonymizedName.toLowerCase(),
        displayName: anonymizedName,
        email: anonymizedEmail,
        passwordHash: "DELETED",
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.appUsers.id, userId));

    // Delete active sessions
    await db.delete(schema.appUserSessions)
      .where(eq(schema.appUserSessions.appUserId, userId));

    // Delete notifications TO this user (preserves notifications FROM this user for audit trail)
    await db.delete(schema.notifications)
      .where(eq(schema.notifications.toUserId, userId));

    await auditLog({
      organizationId: actor.organizationId,
      entityType: "gdpr",
      entityId: userId,
      action: "data_deletion",
      actorEmail: actor.email || actor.username,
      metadata: {
        originalUsername: appUser.username,
        anonymizedTo: anonymizedName,
        deletedSessions: true,
      },
    });

    return NextResponse.json({
      success: true,
      summary: {
        userId,
        anonymizedTo: anonymizedName,
        sessionsDeleted: true,
        auditLogPreserved: true,
      },
    });
  } catch (err: unknown) {
    const message = safeError(err, "Data deletion failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
