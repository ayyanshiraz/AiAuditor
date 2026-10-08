import { withErrorHandling, requireCompanyUserId, requestMeta } from "@/server/api/helpers";
import { postJournalEntry } from "@/server/services/accounting-engine";
import { notifyCompany } from "@/server/services/notifications";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ companyId: string; entryId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, entryId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"]);
    const entry = await postJournalEntry(entryId, userId, requestMeta(req));
    await notifyCompany({
      companyId,
      type: "JOURNAL_ENTRY_POSTED",
      title: "Journal entry posted",
      message: `${entry.entryNumber} — ${entry.description}`,
      excludeUserId: userId,
    });
    return { entry };
  });
}
