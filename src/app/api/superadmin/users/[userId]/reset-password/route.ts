import { z } from "zod";
import { withErrorHandling, requireSuperAdmin, requestMeta } from "@/server/api/helpers";
import { resetUserPassword } from "@/server/services/platform-admin";
import { logAudit } from "@/server/services/audit";

const schema = z.object({
  password: z.string().min(8).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  return withErrorHandling(async () => {
    const { userId: actorId } = await requireSuperAdmin();
    const { userId } = await params;
    const body = schema.parse(await req.json().catch(() => ({})));
    const result = await resetUserPassword(userId, body.password);
    await logAudit({
      userId: actorId,
      action: "USER_PASSWORD_RESET_BY_PLATFORM_OWNER",
      entityType: "User",
      entityId: userId,
      ...requestMeta(req),
    });
    return result;
  });
}
