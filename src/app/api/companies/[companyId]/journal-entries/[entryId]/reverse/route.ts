import { z } from "zod";
import { withErrorHandling, requireCompanyUserId, requestMeta } from "@/server/api/helpers";
import { reverseJournalEntry } from "@/server/services/accounting-engine";
import { notifyCompany } from "@/server/services/notifications";

const schema = z.object({ reason: z.string().optional() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ companyId: string; entryId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, entryId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"]);
    const body = schema.parse(await req.json().catch(() => ({})));
    const reversal = await reverseJournalEntry(entryId, userId, { reason: body.reason, ...requestMeta(req) });
    await notifyCompany({
      companyId,
      type: "JOURNAL_ENTRY_REVERSED",
      title: "Journal entry reversed",
      message: `${reversal.entryNumber} — ${reversal.description}`,
      excludeUserId: userId,
    });
    return { reversal };
  });
}
