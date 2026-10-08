import { z } from "zod";
import { withErrorHandling, requireCompanyUserId, requestMeta } from "@/server/api/helpers";
import { updateEmployee, deleteEmployee } from "@/server/services/parties";
import { logAudit } from "@/server/services/audit";

const schema = z.object({
  name: z.string().min(1).optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  salary: z.number().optional(),
  taxInfo: z.string().optional(),
  bankDetails: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ companyId: string; employeeId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, employeeId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"]);
    const body = schema.parse(await req.json());
    const employee = await updateEmployee(companyId, employeeId, {
      ...body,
      salary: body.salary?.toString(),
    } as never);
    await logAudit({
      companyId,
      userId,
      action: "EMPLOYEE_UPDATED",
      entityType: "Employee",
      entityId: employeeId,
      newValue: body,
      ...requestMeta(req),
    });
    return { employee };
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ companyId: string; employeeId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, employeeId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR"]);
    const result = await deleteEmployee(companyId, employeeId);
    await logAudit({
      companyId,
      userId,
      action: result.deleted ? "EMPLOYEE_DELETED" : "EMPLOYEE_DEACTIVATED",
      entityType: "Employee",
      entityId: employeeId,
      ...requestMeta(req),
    });
    return result;
  });
}
