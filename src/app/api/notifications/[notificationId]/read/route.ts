import { withErrorHandling, requireUserId } from "@/server/api/helpers";
import { markNotificationRead } from "@/server/services/notifications";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  return withErrorHandling(async () => {
    const { notificationId } = await params;
    const userId = await requireUserId();
    const notification = await markNotificationRead(userId, notificationId);
    return { notification };
  });
}
