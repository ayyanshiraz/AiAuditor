import { withErrorHandling, requireCompanyUserId } from "@/server/api/helpers";
import { getBalanceSheet } from "@/server/services/reports";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    await requireCompanyUserId(companyId);
    const url = new URL(req.url);
    const asOf = url.searchParams.get("asOf");
    return getBalanceSheet(companyId, asOf ? new Date(asOf) : new Date());
  });
}
