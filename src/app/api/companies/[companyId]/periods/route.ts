import { z } from "zod";
import { withErrorHandling, requireCompanyUserId } from "@/server/api/helpers";
import { listPeriods, createPeriod, generateMonthlyPeriods } from "@/server/services/periods";

const schema = z.object({
  name: z.string().min(1).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  generateMonthly: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    await requireCompanyUserId(companyId);
    const periods = await listPeriods(companyId);
    return { periods };
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR"]);
    const body = schema.parse(await req.json());
    if (body.generateMonthly) {
      const periods = await generateMonthlyPeriods(companyId, body.startDate);
      return { periods };
    }
    const period = await createPeriod(companyId, {
      name: body.name!,
      startDate: body.startDate,
      endDate: body.endDate!,
    });
    return { period };
  });
}
