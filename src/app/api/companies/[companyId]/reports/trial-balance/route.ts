import { withErrorHandling, requireCompanyUserId } from "@/server/api/helpers";
import { getTrialBalance } from "@/server/services/reports";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    await requireCompanyUserId(companyId);
    const url = new URL(req.url);
    const asOf = url.searchParams.get("asOf");
    return getTrialBalance(companyId, asOf ? new Date(asOf) : new Date());
  });
}
