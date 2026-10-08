import { z } from "zod";
import { withErrorHandling, requireCompanyUserId, requestMeta } from "@/server/api/helpers";
import { updateSupplier, deleteSupplier, getSupplierLedger, getSupplierBalance } from "@/server/services/parties";
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
  { params }: { params: Promise<{ companyId: string; supplierId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, supplierId } = await params;
    await requireCompanyUserId(companyId);
    const [ledger, balance] = await Promise.all([
      getSupplierLedger(companyId, supplierId),
      getSupplierBalance(companyId, supplierId),
    ]);
    return { ledger, balance };
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ companyId: string; supplierId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, supplierId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"]);
    const body = schema.parse(await req.json());
    const supplier = await updateSupplier(companyId, supplierId, body);
    await logAudit({
      companyId,
      userId,
      action: "SUPPLIER_UPDATED",
      entityType: "Supplier",
      entityId: supplierId,
      newValue: body,
      ...requestMeta(req),
    });
    return { supplier };
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ companyId: string; supplierId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, supplierId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR"]);
    const result = await deleteSupplier(companyId, supplierId);
    await logAudit({
      companyId,
      userId,
      action: result.deleted ? "SUPPLIER_DELETED" : "SUPPLIER_DEACTIVATED",
      entityType: "Supplier",
      entityId: supplierId,
      ...requestMeta(req),
    });
    return result;
  });
}
