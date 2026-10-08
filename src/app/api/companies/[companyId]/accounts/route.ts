import { z } from "zod";
import { withErrorHandling, requireCompanyUserId, requestMeta } from "@/server/api/helpers";
import { listAccounts, createAccount } from "@/server/services/chart-of-accounts";
import { logAudit } from "@/server/services/audit";

const createSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "COGS", "EXPENSE"]),
  normalBalance: z.enum(["DEBIT", "CREDIT"]),
  parentId: z.string().optional(),
  description: z.string().optional(),
  isCashOrBank: z.boolean().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    await requireCompanyUserId(companyId);
    const url = new URL(req.url);
    const activeOnly = url.searchParams.get("activeOnly") === "true";
    const accounts = await listAccounts(companyId, { activeOnly });
    return { accounts };
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"]);
    const body = createSchema.parse(await req.json());
    const account = await createAccount(companyId, body);
    await logAudit({
      companyId,
      userId,
      action: "ACCOUNT_CREATED",
      entityType: "Account",
      entityId: account.id,
      newValue: account,
      ...requestMeta(req),
    });
    return { account };
  });
}
