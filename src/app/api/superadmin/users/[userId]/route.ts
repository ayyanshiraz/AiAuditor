import { z } from "zod";
import { withErrorHandling, requireSuperAdmin, requestMeta } from "@/server/api/helpers";
import { setUserDisabled, deleteUserAccount } from "@/server/services/platform-admin";
import { logAudit } from "@/server/services/audit";

const patchSchema = z.object({
  disabled: z.boolean(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  return withErrorHandling(async () => {
    const { userId: actorId } = await requireSuperAdmin();
    const { userId } = await params;
    const body = patchSchema.parse(await req.json());
    const updated = await setUserDisabled(userId, body.disabled);
    await logAudit({
      userId: actorId,
      action: body.disabled ? "USER_DISABLED" : "USER_ENABLED",
      entityType: "User",
      entityId: userId,
      ...requestMeta(req),
    });
    return { user: { id: updated.id, disabledAt: updated.disabledAt } };
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  return withErrorHandling(async () => {
    const { userId: actorId } = await requireSuperAdmin();
    const { userId } = await params;
    const url = new URL(req.url);
    const cascade = url.searchParams.get("cascade") === "true";
    const result = await deleteUserAccount(userId, { cascadeOwnedCompanies: cascade });
    await logAudit({
      userId: actorId,
      action: "USER_DELETED",
      entityType: "User",
      entityId: userId,
      previousValue: { cascade },
      ...requestMeta(req),
    });
    return result;
  });
}
