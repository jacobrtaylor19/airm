import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, ne } from "drizzle-orm";
import { NotificationsClient } from "./notifications-client";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  const user = requireAuth();

  // Load sent + received notifications
  const inbox = db
    .select({
      id: schema.notifications.id,
      fromUserId: schema.notifications.fromUserId,
      toUserId: schema.notifications.toUserId,
      notificationType: schema.notifications.notificationType,
      subject: schema.notifications.subject,
      message: schema.notifications.message,
      status: schema.notifications.status,
      createdAt: schema.notifications.createdAt,
      fromDisplayName: schema.appUsers.displayName,
    })
    .from(schema.notifications)
    .innerJoin(schema.appUsers, eq(schema.appUsers.id, schema.notifications.fromUserId))
    .where(eq(schema.notifications.toUserId, user.id))
    .all()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // For coordinators/admins: load app users who can receive notifications (mappers + approvers)
  const recipients = ["coordinator", "admin", "system_admin"].includes(user.role)
    ? db
        .select({
          id: schema.appUsers.id,
          displayName: schema.appUsers.displayName,
          role: schema.appUsers.role,
          assignedOrgUnitId: schema.appUsers.assignedOrgUnitId,
          isActive: schema.appUsers.isActive,
        })
        .from(schema.appUsers)
        .where(ne(schema.appUsers.id, user.id))
        .all()
        .filter(u => u.isActive !== false && ["mapper", "approver"].includes(u.role))
        .map(({ isActive: _ia, ...rest }) => rest)
    : [];

  // Sent notifications (for coordinators to track what they sent)
  const sent = ["coordinator", "admin", "system_admin"].includes(user.role)
    ? db
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
        .where(eq(schema.notifications.fromUserId, user.id))
        .all()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];

  const canSend = ["coordinator", "admin", "system_admin"].includes(user.role);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {canSend
          ? "Send reminders and escalations to mappers and approvers. No emails are sent in this demo — notifications appear in each user's inbox."
          : "View notifications sent to you by coordinators and admins."}
      </p>
      <NotificationsClient
        inbox={inbox}
        sent={sent}
        recipients={recipients}
        canSend={canSend}
        currentUserId={user.id}
      />
    </div>
  );
}
