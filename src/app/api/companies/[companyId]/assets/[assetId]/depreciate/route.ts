import { z } from "zod";
import { withErrorHandling, requireCompanyUserId } from "@/server/api/helpers";
import { recordDepreciation } from "@/server/services/assets";

const schema = z.object({
  date: z.coerce.date(),
  amount: z.number().positive().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ companyId: string; assetId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, assetId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"]);
    const body = schema.parse(await req.json());
    const entry = await recordDepreciation({ companyId, assetId, date: body.date, amount: body.amount, createdBy: userId });
    return { entry };
  });
}
