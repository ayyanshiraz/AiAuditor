import { and, eq, desc } from "drizzle-orm";
import { db } from "@/server/db";
import { notifications, companyMembers } from "@/server/db/schema";

export type NotificationType =
  | "JOURNAL_ENTRY_POSTED"
  | "JOURNAL_ENTRY_REVERSED"
  | "PERIOD_CLOSED"
  | "PERIOD_REOPENED"
  | "USER_INVITED"
  | "PERMISSION_CHANGED";

/** Creates a single notification for one user. */
export async function createNotification(input: {
  companyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}) {
  const [row] = await db
    .insert(notifications)
    .values({
      companyId: input.companyId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
    })
    .returning();
  return row;
}

/**
 * Fans a notification out to every member of a company (optionally skipping
 * the user who triggered the event, since people don't need to be told
 * about their own action).
 */
export async function notifyCompany(input: {
  companyId: string;
  type: NotificationType;
  title: string;
  message: string;
  excludeUserId?: string;
}) {
  const members = await db
    .select({ userId: companyMembers.userId })
    .from(companyMembers)
    .where(eq(companyMembers.companyId, input.companyId));

  const recipients = members
    .map((m) => m.userId)
    .filter((id) => id !== input.excludeUserId);

  if (recipients.length === 0) return [];

  return db
    .insert(notifications)
    .values(
      recipients.map((userId) => ({
        companyId: input.companyId,
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
      }))
    )
    .returning();
}

export async function listNotifications(userId: string, opts?: { unreadOnly?: boolean; limit?: number }) {
  const conditions = [eq(notifications.userId, userId)];
  if (opts?.unreadOnly) conditions.push(eq(notifications.isRead, false));

  return db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(opts?.limit ?? 30);
}

export async function unreadNotificationCount(userId: string) {
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return rows.length;
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const [row] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning();
  return row;
}

export async function markAllNotificationsRead(userId: string) {
  return db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .returning();
}
