import { z } from "zod";
import { withErrorHandling, requireCompanyUserId, requestMeta } from "@/server/api/helpers";
import { listJournalEntries } from "@/server/services/journal";
import { recordManualJournal } from "@/server/services/transactions";

const lineSchema = z.object({
  accountId: z.string(),
  debit: z.number().min(0).optional(),
  credit: z.number().min(0).optional(),
  description: z.string().optional(),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  employeeId: z.string().optional(),
  assetId: z.string().optional(),
});

const createSchema = z.object({
  date: z.coerce.date(),
  description: z.string().min(1),
  reference: z.string().optional(),
  lines: z.array(lineSchema).min(2),
  autoPost: z.boolean().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    await requireCompanyUserId(companyId);
    const url = new URL(req.url);
    const sp = url.searchParams;
    const result = await listJournalEntries({
      companyId,
      from: sp.get("from") ? new Date(sp.get("from")!) : undefined,
      to: sp.get("to") ? new Date(sp.get("to")!) : undefined,
      transactionType: sp.get("transactionType") ?? undefined,
      status: sp.get("status") ?? undefined,
      search: sp.get("search") ?? undefined,
      page: sp.get("page") ? Number(sp.get("page")) : undefined,
      pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : undefined,
    });
    return result;
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"]);
    const body = createSchema.parse(await req.json());
    const entry = await recordManualJournal({
      companyId,
      date: body.date,
      description: body.description,
      reference: body.reference,
      lines: body.lines,
      createdBy: userId,
      autoPost: body.autoPost,
    });
    return { entry };
  });
}
