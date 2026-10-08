import { withErrorHandling, requireSuperAdmin } from "@/server/api/helpers";
import { getPlatformOverview } from "@/server/services/platform-admin";

export async function GET() {
  return withErrorHandling(async () => {
    await requireSuperAdmin();
    return getPlatformOverview();
  });
}
