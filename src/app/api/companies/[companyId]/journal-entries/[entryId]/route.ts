import { z } from "zod";
import { withErrorHandling, requireCompanyUserId, requestMeta } from "@/server/api/helpers";
import { getJournalEntryDetail } from "@/server/services/journal";
import { updateJournalEntry, deleteJournalEntry } from "@/server/services/accounting-engine";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string; entryId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, entryId } = await params;
    await requireCompanyUserId(companyId);
    return getJournalEntryDetail(companyId, entryId);
  });
}

const lineSchema = z.object({
  accountId: z.string(),
  debit: z.coerce.number().min(0).optional(),
  credit: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
  customerId: z.string().nullable().optional(),
  supplierId: z.string().nullable().optional(),
  employeeId: z.string().nullable().optional(),
  assetId: z.string().nullable().optional(),
  taxRateId: z.string().nullable().optional(),
});

const updateSchema = z.object({
  entryDate: z.coerce.date(),
  description: z.string().min(1),
  reference: z.string().optional(),
  lines: z.array(lineSchema).min(2),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ companyId: string; entryId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, entryId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"]);
    const body = updateSchema.parse(await req.json());
    const entry = await updateJournalEntry(entryId, companyId, body, userId, requestMeta(req));
    return { entry };
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ companyId: string; entryId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, entryId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR"]);
    return deleteJournalEntry(entryId, companyId, userId, requestMeta(req));
  });
}
