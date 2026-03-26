import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GDPR Article 15 — Right of Access (Data Subject Access Request).
 * Returns all data associated with a given app user.
 */
export async function POST(req: NextRequest) {
  const actor = getSessionUser();
  if (!actor || actor.role !== "system_admin") {
    return NextResponse.json({ error: "Unauthorized — system_admin role required" }, { status: 403 });
  }

  try {
    const { userId } = await req.json();
    if (!userId || typeof userId !== "number") {
      return NextResponse.json({ error: "userId (number) is required" }, { status: 400 });
    }

    const appUser = db.select().from(schema.appUsers).where(eq(schema.appUsers.id, userId)).get();
    if (!appUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Collect all associated data
    const sessions = db.select().from(schema.appUserSessions).where(eq(schema.appUserSessions.appUserId, userId)).all();
    const workAssigns = db.select().from(schema.workAssignments).where(eq(schema.workAssignments.appUserId, userId)).all();
    const notifications = db.select().from(schema.notifications).where(eq(schema.notifications.toUserId, userId)).all();

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: actor.username,
      subject: {
        id: appUser.id,
        username: appUser.username,
        displayName: appUser.displayName,
        email: appUser.email,
        role: appUser.role,
        assignedOrgUnitId: appUser.assignedOrgUnitId,
        isActive: appUser.isActive,
        createdAt: appUser.createdAt,
      },
      sessions: sessions.map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      })),
      workAssignments: workAssigns,
      notifications: notifications.map((n) => ({
        id: n.id,
        notificationType: n.notificationType,
        subject: n.subject,
        message: n.message,
        status: n.status,
        createdAt: n.createdAt,
      })),
    };

    auditLog({
      entityType: "gdpr",
      entityId: userId,
      action: "data_export",
      actorEmail: actor.email || actor.username,
      metadata: { subjectUsername: appUser.username },
    });

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="data-export-user-${userId}-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err: unknown) {
    const message = safeError(err, "Data export failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
