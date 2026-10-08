import { z } from "zod";
import { withErrorHandling, requireCompanyUserId, requestMeta } from "@/server/api/helpers";
import { listEmployees, createEmployee } from "@/server/services/parties";
import { nextNumber } from "@/server/services/numbering";
import { logAudit } from "@/server/services/audit";
import { db } from "@/server/db";

const schema = z.object({
  name: z.string().min(1),
  department: z.string().optional(),
  position: z.string().optional(),
  salary: z.number().optional(),
  joiningDate: z.coerce.date().optional(),
  taxInfo: z.string().optional(),
  bankDetails: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    await requireCompanyUserId(companyId);
    const employees = await listEmployees(companyId);
    return { employees };
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
    const employeeCode = await db.transaction((tx) => nextNumber(tx, companyId, "EMP", 4));
    const employee = await createEmployee(companyId, {
      ...body,
      employeeCode,
      salary: body.salary?.toString(),
    } as never);
    await logAudit({
      companyId,
      userId,
      action: "EMPLOYEE_CREATED",
      entityType: "Employee",
      entityId: employee.id,
      newValue: employee,
      ...requestMeta(req),
    });
    return { employee };
  });
}
