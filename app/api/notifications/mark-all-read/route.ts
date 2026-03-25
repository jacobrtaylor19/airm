import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH — mark all notifications for the current user as read
export async function PATCH() {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  db.update(schema.notifications)
    .set({ status: "read", readAt: new Date().toISOString() })
    .where(
      and(
        eq(schema.notifications.toUserId, user.id),
        isNull(schema.notifications.readAt)
      )
    )
    .run();

  return NextResponse.json({ ok: true });
}
