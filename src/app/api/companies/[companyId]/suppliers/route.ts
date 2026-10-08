import { z } from "zod";
import { withErrorHandling, requireCompanyUserId, requestMeta } from "@/server/api/helpers";
import { listSuppliers, createSupplier, getSupplierBalance } from "@/server/services/parties";
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
    const suppliers = await listSuppliers(companyId);
    const withBalances = await Promise.all(
      suppliers.map(async (s) => ({ ...s, balance: await getSupplierBalance(companyId, s.id) }))
    );
    return { suppliers: withBalances };
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
    const supplier = await createSupplier(companyId, {
      ...body,
      openingBalance: body.openingBalance?.toString() ?? "0",
    } as never);
    await logAudit({
      companyId,
      userId,
      action: "SUPPLIER_CREATED",
      entityType: "Supplier",
      entityId: supplier.id,
      newValue: supplier,
      ...requestMeta(req),
    });
    return { supplier };
  });
}
