import { z } from "zod";
import { withErrorHandling, requireCompanyUserId, requestMeta } from "@/server/api/helpers";
import { getAsset, updateAsset } from "@/server/services/assets";
import { logAudit } from "@/server/services/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string; assetId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, assetId } = await params;
    await requireCompanyUserId(companyId);
    const asset = await getAsset(companyId, assetId);
    return { asset };
  });
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  location: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ companyId: string; assetId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, assetId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"]);
    const body = patchSchema.parse(await req.json());
    const asset = await updateAsset(companyId, assetId, body);
    await logAudit({
      companyId,
      userId,
      action: "ASSET_UPDATED",
      entityType: "Asset",
      entityId: assetId,
      newValue: body,
      ...requestMeta(req),
    });
    return { asset };
  });
}
