import { withErrorHandling, requireSuperAdmin, requestMeta } from "@/server/api/helpers";
import { removeUserFromCompany } from "@/server/services/platform-admin";
import { logAudit } from "@/server/services/audit";

/** Removes this user from this one company (their account and other memberships are untouched). */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ companyId: string; userId: string }> }
) {
  return withErrorHandling(async () => {
    const { userId: actorId } = await requireSuperAdmin();
    const { companyId, userId } = await params;
    const result = await removeUserFromCompany(companyId, userId);
    await logAudit({
      companyId,
      userId: actorId,
      action: "USER_REMOVED_FROM_COMPANY_BY_PLATFORM_OWNER",
      entityType: "CompanyMember",
      entityId: userId,
      ...requestMeta(req),
    });
    return result;
  });
}
