import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { InboxClient } from "./inbox-client";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const user = await requireAuth();

  const notifications = await db
    .select({
      id: schema.notifications.id,
      fromUserId: schema.notifications.fromUserId,
      toUserId: schema.notifications.toUserId,
      notificationType: schema.notifications.notificationType,
      subject: schema.notifications.subject,
      message: schema.notifications.message,
      actionUrl: schema.notifications.actionUrl,
      status: schema.notifications.status,
      readAt: schema.notifications.readAt,
      createdAt: schema.notifications.createdAt,
      fromDisplayName: schema.appUsers.displayName,
    })
    .from(schema.notifications)
    .innerJoin(schema.appUsers, eq(schema.appUsers.id, schema.notifications.fromUserId))
    .where(eq(schema.notifications.toUserId, user.id))
    .orderBy(desc(schema.notifications.createdAt));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Your notifications and workflow updates.
      </p>
      <InboxClient notifications={notifications} />
    </div>
  );
}
