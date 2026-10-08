import { z } from "zod";
import { withErrorHandling, requireCompanyUserId, requestMeta } from "@/server/api/helpers";
import { updateAccount, deleteAccount } from "@/server/services/chart-of-accounts";
import { logAudit } from "@/server/services/audit";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
  isCashOrBank: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ companyId: string; accountId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, accountId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"]);
    const body = updateSchema.parse(await req.json());
    const account = await updateAccount(companyId, accountId, body);
    await logAudit({
      companyId,
      userId,
      action: "ACCOUNT_UPDATED",
      entityType: "Account",
      entityId: accountId,
      newValue: body,
      ...requestMeta(req),
    });
    return { account };
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ companyId: string; accountId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, accountId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR"]);
    const result = await deleteAccount(companyId, accountId);
    await logAudit({
      companyId,
      userId,
      action: result.deleted ? "ACCOUNT_DELETED" : "ACCOUNT_DEACTIVATED",
      entityType: "Account",
      entityId: accountId,
      ...requestMeta(req),
    });
    return result;
  });
}
