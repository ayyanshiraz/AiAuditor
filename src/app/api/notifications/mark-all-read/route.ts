import { withErrorHandling, requireUserId } from "@/server/api/helpers";
import { markAllNotificationsRead } from "@/server/services/notifications";

export async function POST() {
  return withErrorHandling(async () => {
    const userId = await requireUserId();
    const updated = await markAllNotificationsRead(userId);
    return { updated: updated.length };
  });
}
