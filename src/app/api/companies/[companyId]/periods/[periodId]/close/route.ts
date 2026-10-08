import { withErrorHandling, requireCompanyUserId } from "@/server/api/helpers";
import { closePeriod } from "@/server/services/periods";
import { notifyCompany } from "@/server/services/notifications";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ companyId: string; periodId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, periodId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR"]);
    const period = await closePeriod(companyId, periodId, userId);
    await notifyCompany({
      companyId,
      type: "PERIOD_CLOSED",
      title: "Accounting period closed",
      message: `${period.name} has been closed. No new postings are allowed for this period.`,
      excludeUserId: userId,
    });
    return { period };
  });
}
