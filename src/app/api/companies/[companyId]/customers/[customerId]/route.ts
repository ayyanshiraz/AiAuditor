import { z } from "zod";
import { withErrorHandling, requireCompanyUserId, requestMeta } from "@/server/api/helpers";
import { updateCustomer, deleteCustomer, getCustomerLedger, getCustomerBalance } from "@/server/services/parties";
import { logAudit } from "@/server/services/audit";

const schema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxNumber: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string; customerId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, customerId } = await params;
    await requireCompanyUserId(companyId);
    const [ledger, balance] = await Promise.all([
      getCustomerLedger(companyId, customerId),
      getCustomerBalance(companyId, customerId),
    ]);
    return { ledger, balance };
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ companyId: string; customerId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, customerId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"]);
    const body = schema.parse(await req.json());
    const customer = await updateCustomer(companyId, customerId, body);
    await logAudit({
      companyId,
      userId,
      action: "CUSTOMER_UPDATED",
      entityType: "Customer",
      entityId: customerId,
      newValue: body,
      ...requestMeta(req),
    });
    return { customer };
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ companyId: string; customerId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, customerId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR"]);
    const result = await deleteCustomer(companyId, customerId);
    await logAudit({
      companyId,
      userId,
      action: result.deleted ? "CUSTOMER_DELETED" : "CUSTOMER_DEACTIVATED",
      entityType: "Customer",
      entityId: customerId,
      ...requestMeta(req),
    });
    return result;
  });
}
