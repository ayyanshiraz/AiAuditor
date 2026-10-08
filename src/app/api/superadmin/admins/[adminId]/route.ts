import { z } from "zod";
import { withErrorHandling, requireSuperAdmin, requestMeta } from "@/server/api/helpers";
import { getAdminDetail, updateAdminLimits, deleteUserAccount } from "@/server/services/platform-admin";
import { logAudit } from "@/server/services/audit";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  maxCompanies: z.number().int().min(0).nullable().optional(),
  maxTeamMembers: z.number().int().min(0).nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ adminId: string }> }
) {
  return withErrorHandling(async () => {
    await requireSuperAdmin();
    const { adminId } = await params;
    return getAdminDetail(adminId);
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ adminId: string }> }
) {
  return withErrorHandling(async () => {
    const { userId } = await requireSuperAdmin();
    const { adminId } = await params;
    const body = updateSchema.parse(await req.json());
    const updated = await updateAdminLimits(adminId, body);
    await logAudit({
      userId,
      action: "ADMIN_ACCOUNT_UPDATED",
      entityType: "User",
      entityId: adminId,
      newValue: body,
      ...requestMeta(req),
    });
    return { admin: updated };
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ adminId: string }> }
) {
  return withErrorHandling(async () => {
    const { userId } = await requireSuperAdmin();
    const { adminId } = await params;
    const url = new URL(req.url);
    const cascade = url.searchParams.get("cascade") === "true";
    const result = await deleteUserAccount(adminId, { cascadeOwnedCompanies: cascade });
    await logAudit({
      userId,
      action: "ADMIN_ACCOUNT_DELETED",
      entityType: "User",
      entityId: adminId,
      previousValue: { cascade },
      ...requestMeta(req),
    });
    return result;
  });
}
