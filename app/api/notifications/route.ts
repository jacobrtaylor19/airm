import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — fetch notifications for the current user (inbox) or sent (coordinator)
export async function GET(req: NextRequest) {
  const user = await requireAuth();
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "inbox"; // "inbox" | "sent"

  const toUserId = user.id;
  const fromUserId = user.id;

  const rows = await db
    .select({
      id: schema.notifications.id,
      fromUserId: schema.notifications.fromUserId,
      toUserId: schema.notifications.toUserId,
      notificationType: schema.notifications.notificationType,
      subject: schema.notifications.subject,
      message: schema.notifications.message,
      relatedEntityType: schema.notifications.relatedEntityType,
      relatedEntityId: schema.notifications.relatedEntityId,
      actionUrl: schema.notifications.actionUrl,
      status: schema.notifications.status,
      readAt: schema.notifications.readAt,
      createdAt: schema.notifications.createdAt,
      fromDisplayName: schema.appUsers.displayName,
    })
    .from(schema.notifications)
    .innerJoin(schema.appUsers, eq(schema.appUsers.id, schema.notifications.fromUserId))
    .where(
      view === "sent"
        ? eq(schema.notifications.fromUserId, fromUserId)
        : eq(schema.notifications.toUserId, toUserId)
    )
    .orderBy(desc(schema.notifications.createdAt));

  return NextResponse.json(rows);
}

// POST — send a notification (coordinator, admin)
export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!["coordinator", "admin", "system_admin"].includes(user.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const { toUserIds, notificationType, subject, message, relatedEntityType, relatedEntityId } = body;

  if (!toUserIds?.length || !subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "toUserIds, subject, and message are required" }, { status: 400 });
  }

  const inserted: number[] = [];
  for (const toUserId of toUserIds as number[]) {
    const [row] = await db.insert(schema.notifications).values({
      fromUserId: user.id,
      toUserId,
      notificationType: notificationType ?? "reminder",
      subject: subject.trim(),
      message: message.trim(),
      relatedEntityType: relatedEntityType ?? null,
      relatedEntityId: relatedEntityId ?? null,
      status: "sent",
    }).returning({ id: schema.notifications.id });
    inserted.push(row.id);
  }

  return NextResponse.json({ ok: true, sent: inserted.length, ids: inserted });
}

// PATCH — mark notification as read
export async function PATCH(req: NextRequest) {
  await requireAuth();
  const body = await req.json();
  const { id } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.update(schema.notifications)
    .set({ status: "read", readAt: new Date().toISOString() })
    .where(eq(schema.notifications.id, id));

  return NextResponse.json({ ok: true });
}
