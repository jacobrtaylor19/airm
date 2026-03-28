import { requireAuth, requireRole } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, ne } from "drizzle-orm";
import { NotificationsClient } from "./notifications-client";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireAuth();
  await requireRole(["admin", "system_admin", "coordinator"]);

  // For coordinators/admins: load app users who can receive notifications (mappers + approvers)
  const recipients = ["coordinator", "admin", "system_admin"].includes(user.role)
    ? (await db
        .select({
          id: schema.appUsers.id,
          displayName: schema.appUsers.displayName,
          role: schema.appUsers.role,
          assignedOrgUnitId: schema.appUsers.assignedOrgUnitId,
          isActive: schema.appUsers.isActive,
        })
        .from(schema.appUsers)
        .where(ne(schema.appUsers.id, user.id)))
        .filter(u => u.isActive !== false && ["mapper", "approver"].includes(u.role))
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ isActive, ...rest }) => rest)
    : [];

  // Sent notifications (for coordinators to track what they sent)
  const sent = ["coordinator", "admin", "system_admin"].includes(user.role)
    ? (await db
        .select({
          id: schema.notifications.id,
          fromUserId: schema.notifications.fromUserId,
          toUserId: schema.notifications.toUserId,
          notificationType: schema.notifications.notificationType,
          subject: schema.notifications.subject,
          message: schema.notifications.message,
          status: schema.notifications.status,
          createdAt: schema.notifications.createdAt,
          toDisplayName: schema.appUsers.displayName,
        })
        .from(schema.notifications)
        .innerJoin(schema.appUsers, eq(schema.appUsers.id, schema.notifications.toUserId))
        .where(eq(schema.notifications.fromUserId, user.id)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];

  const canSend = ["coordinator", "admin", "system_admin"].includes(user.role);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Send reminders and escalations to mappers and approvers. No emails are sent in this demo — reminders are logged in the Sent tab.
      </p>
      <NotificationsClient
        sent={sent}
        recipients={recipients}
        canSend={canSend}
        currentUserId={user.id}
      />
    </div>
  );
}
