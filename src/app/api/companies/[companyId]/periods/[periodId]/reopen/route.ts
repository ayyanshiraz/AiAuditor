import { withErrorHandling, requireCompanyUserId } from "@/server/api/helpers";
import { reopenPeriod } from "@/server/services/periods";
import { notifyCompany } from "@/server/services/notifications";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ companyId: string; periodId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, periodId } = await params;
    // Reopening a closed period is deliberately restricted to Owners only.
    const { userId } = await requireCompanyUserId(companyId, ["OWNER"]);
    const period = await reopenPeriod(companyId, periodId, userId);
    await notifyCompany({
      companyId,
      type: "PERIOD_REOPENED",
      title: "Accounting period reopened",
      message: `${period.name} has been reopened for posting.`,
      excludeUserId: userId,
    });
    return { period };
  });
}
