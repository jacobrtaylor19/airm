import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { sendNotificationEmail } from "@/lib/email";

/**
 * Create a workflow/system notification for a user.
 * Uses a "system" sender — fromUserId defaults to the first system_admin account.
 */
export async function createWorkflowNotification(params: {
  toUserId: number;
  notificationType: "workflow_event" | "reminder" | "system";
  subject: string;
  message: string;
  actionUrl?: string;
}): Promise<void> {
  // Find a system user to use as the sender (first system_admin, or first admin)
  const [systemUser] = await db
    .select({ id: schema.appUsers.id })
    .from(schema.appUsers)
    .where(eq(schema.appUsers.role, "system_admin"));

  const fromUserId = systemUser?.id ?? 1; // fallback to user id 1

  await db.insert(schema.notifications).values({
    fromUserId,
    toUserId: params.toUserId,
    notificationType: params.notificationType,
    subject: params.subject,
    message: params.message,
    actionUrl: params.actionUrl ?? null,
    status: "sent",
  });

  // Also send email notification (fire-and-forget)
  try {
    const [recipient] = await db
      .select({ email: schema.appUsers.email })
      .from(schema.appUsers)
      .where(eq(schema.appUsers.id, params.toUserId));

    if (recipient?.email) {
      // Don't await — fire and forget
      sendNotificationEmail(
        recipient.email,
        params.subject,
        params.message,
        params.actionUrl,
      ).catch(() => {}); // silently ignore email failures
    }
  } catch {
    // Email is best-effort, don't fail the notification
  }
}

/**
 * Notify all users with the given roles about a workflow event.
 */
export async function notifyUsersWithRoles(params: {
  roles: string[];
  notificationType: "workflow_event" | "reminder" | "system";
  subject: string;
  message: string;
  actionUrl?: string;
}): Promise<void> {
  const users = (
    await db
      .select({ id: schema.appUsers.id, role: schema.appUsers.role })
      .from(schema.appUsers)
  ).filter((u) => params.roles.includes(u.role));

  // createWorkflowNotification handles both DB insert and email send per user
  for (const u of users) {
    await createWorkflowNotification({
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
export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const rows = await db
    .select({ id: schema.notifications.id })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.toUserId, userId),
        isNull(schema.notifications.readAt)
      )
    );
  return rows.length;
}
