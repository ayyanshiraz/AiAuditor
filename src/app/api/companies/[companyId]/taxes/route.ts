import { z } from "zod";
import { withErrorHandling, requireCompanyUserId, requestMeta } from "@/server/api/helpers";
import { listTaxRates, createTaxRate } from "@/server/services/taxes";
import { logAudit } from "@/server/services/audit";

const schema = z.object({
  name: z.string().min(1),
  rate: z.number().min(0).max(100),
  taxType: z.string().min(1),
  taxAccountId: z.string(),
  effectiveDate: z.coerce.date(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    await requireCompanyUserId(companyId);
    const taxRates = await listTaxRates(companyId);
    return { taxRates };
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"]);
    const body = schema.parse(await req.json());
    const taxRate = await createTaxRate(companyId, body);
    await logAudit({
      companyId,
      userId,
      action: "TAX_RATE_CREATED",
      entityType: "TaxRate",
      entityId: taxRate.id,
      newValue: taxRate,
      ...requestMeta(req),
    });
    return { taxRate };
  });
}
