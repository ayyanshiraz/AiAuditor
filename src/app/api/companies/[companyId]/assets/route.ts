import { z } from "zod";
import { withErrorHandling, requireCompanyUserId } from "@/server/api/helpers";
import { listAssets, createAsset } from "@/server/services/assets";

const schema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  purchaseDate: z.coerce.date(),
  purchaseValue: z.number().positive(),
  usefulLifeMonths: z.number().int().positive(),
  residualValue: z.number().min(0).optional(),
  location: z.string().optional(),
  supplierId: z.string().optional(),
  assetAccountId: z.string(),
  accumulatedDeprAccountId: z.string(),
  depreciationExpenseAccountId: z.string(),
  paymentAccountId: z.string(),
  isCredit: z.boolean().optional(),
  payableAccountId: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    await requireCompanyUserId(companyId);
    const assets = await listAssets(companyId);
    return { assets };
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
    const asset = await createAsset({ companyId, createdBy: userId, ...body });
    return { asset };
  });
}
