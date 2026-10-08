import { withErrorHandling, requireCompanyUserId } from "@/server/api/helpers";
import { getCashFlowStatement } from "@/server/services/reports";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    await requireCompanyUserId(companyId);
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), 0, 1);
    return getCashFlowStatement(companyId, from ? new Date(from) : defaultFrom, to ? new Date(to) : now);
  });
}
