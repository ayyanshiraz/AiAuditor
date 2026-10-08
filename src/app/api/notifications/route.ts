import { withErrorHandling, requireUserId } from "@/server/api/helpers";
import { listNotifications, unreadNotificationCount } from "@/server/services/notifications";

export async function GET() {
  return withErrorHandling(async () => {
    const userId = await requireUserId();
    const [items, unreadCount] = await Promise.all([
      listNotifications(userId, { limit: 30 }),
      unreadNotificationCount(userId),
    ]);
    return { items, unreadCount };
  });
}
