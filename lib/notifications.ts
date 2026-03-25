import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Create a workflow/system notification for a user.
 * Uses a "system" sender — fromUserId defaults to the first system_admin account.
 */
export function createWorkflowNotification(params: {
  toUserId: number;
  notificationType: "workflow_event" | "reminder" | "system";
  subject: string;
  message: string;
  actionUrl?: string;
}): void {
  // Find a system user to use as the sender (first system_admin, or first admin)
  const systemUser = db
    .select({ id: schema.appUsers.id })
    .from(schema.appUsers)
    .where(eq(schema.appUsers.role, "system_admin"))
    .get();

  const fromUserId = systemUser?.id ?? 1; // fallback to user id 1

  db.insert(schema.notifications)
    .values({
      fromUserId,
      toUserId: params.toUserId,
      notificationType: params.notificationType,
      subject: params.subject,
      message: params.message,
      actionUrl: params.actionUrl ?? null,
      status: "sent",
    })
    .run();
}

/**
 * Notify all users with the given roles about a workflow event.
 */
export function notifyUsersWithRoles(params: {
  roles: string[];
  notificationType: "workflow_event" | "reminder" | "system";
  subject: string;
  message: string;
  actionUrl?: string;
}): void {
  const users = db
    .select({ id: schema.appUsers.id, role: schema.appUsers.role })
    .from(schema.appUsers)
    .all()
    .filter(
      (u) => params.roles.includes(u.role)
    );

  for (const u of users) {
    createWorkflowNotification({
      toUserId: u.id,
      notificationType: params.notificationType,
      subject: params.subject,
      message: params.message,
      actionUrl: params.actionUrl,
    });
  }
}

/**
 * Get the unread notification count for a given user.
 */
export function getUnreadNotificationCount(userId: number): number {
  const rows = db
    .select({ id: schema.notifications.id })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.toUserId, userId),
        isNull(schema.notifications.readAt)
      )
    )
    .all();
  return rows.length;
}
