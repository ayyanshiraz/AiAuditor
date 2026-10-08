import { z } from "zod";
import { withErrorHandling, requireCompanyUserId, requestMeta } from "@/server/api/helpers";
import { listCustomers, createCustomer, getCustomerBalance } from "@/server/services/parties";
import { logAudit } from "@/server/services/audit";

const schema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxNumber: z.string().optional(),
  openingBalance: z.number().optional(),
  notes: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    await requireCompanyUserId(companyId);
    const customers = await listCustomers(companyId);
    const withBalances = await Promise.all(
      customers.map(async (c) => ({ ...c, balance: await getCustomerBalance(companyId, c.id) }))
    );
    return { customers: withBalances };
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
    const customer = await createCustomer(companyId, {
      ...body,
      openingBalance: body.openingBalance?.toString() ?? "0",
    } as never);
    await logAudit({
      companyId,
      userId,
      action: "CUSTOMER_CREATED",
      entityType: "Customer",
      entityId: customer.id,
      newValue: customer,
      ...requestMeta(req),
    });
    return { customer };
  });
}
