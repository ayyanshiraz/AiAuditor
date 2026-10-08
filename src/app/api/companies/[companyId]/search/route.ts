import { withErrorHandling, requireCompanyUserId } from "@/server/api/helpers";
import { globalSearch } from "@/server/services/search";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    await requireCompanyUserId(companyId);

    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";

    const results = await globalSearch(companyId, q);
    return { results };
  });
}
