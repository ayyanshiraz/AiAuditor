import { withErrorHandling, requireCompanyUserId } from "@/server/api/helpers";
import { lockPeriod } from "@/server/services/periods";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ companyId: string; periodId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, periodId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER"]);
    const period = await lockPeriod(companyId, periodId, userId);
    return { period };
  });
}
