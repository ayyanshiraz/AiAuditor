import { z } from "zod";
import { withErrorHandling, requireCompanyUserId, requestMeta } from "@/server/api/helpers";
import { updateTaxRate, deleteTaxRate } from "@/server/services/taxes";
import { logAudit } from "@/server/services/audit";

const schema = z.object({
  name: z.string().min(1).optional(),
  rate: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ companyId: string; taxRateId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, taxRateId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"]);
    const body = schema.parse(await req.json());
    const taxRate = await updateTaxRate(companyId, taxRateId, body);
    await logAudit({
      companyId,
      userId,
      action: "TAX_RATE_UPDATED",
      entityType: "TaxRate",
      entityId: taxRateId,
      newValue: body,
      ...requestMeta(req),
    });
    return { taxRate };
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ companyId: string; taxRateId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, taxRateId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR"]);
    const result = await deleteTaxRate(companyId, taxRateId);
    await logAudit({
      companyId,
      userId,
      action: result.deleted ? "TAX_RATE_DELETED" : "TAX_RATE_DEACTIVATED",
      entityType: "TaxRate",
      entityId: taxRateId,
      ...requestMeta(req),
    });
    return result;
  });
}
