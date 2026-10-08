import { withErrorHandling, requireCompanyUserId, requestMeta } from "@/server/api/helpers";
import { voidJournalEntry } from "@/server/services/accounting-engine";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ companyId: string; entryId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, entryId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"]);
    const entry = await voidJournalEntry(entryId, userId, requestMeta(req));
    return { entry };
  });
}
