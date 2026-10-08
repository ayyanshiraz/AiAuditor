import { z } from "zod";
import { withErrorHandling, requireCompanyUserId } from "@/server/api/helpers";
import { disposeAsset } from "@/server/services/assets";

const schema = z.object({
  date: z.coerce.date(),
  proceeds: z.number().min(0),
  receiptAccountId: z.string().optional(),
  gainAccountId: z.string().optional(),
  lossAccountId: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ companyId: string; assetId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, assetId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"]);
    const body = schema.parse(await req.json());
    const result = await disposeAsset({ companyId, assetId, createdBy: userId, ...body });
    return result;
  });
}
