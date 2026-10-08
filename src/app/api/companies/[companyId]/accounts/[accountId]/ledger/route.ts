import { withErrorHandling, requireCompanyUserId } from "@/server/api/helpers";
import { getAccountLedger } from "@/server/services/reports";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string; accountId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, accountId } = await params;
    await requireCompanyUserId(companyId);
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const ledger = await getAccountLedger(companyId, accountId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    return ledger;
  });
}
