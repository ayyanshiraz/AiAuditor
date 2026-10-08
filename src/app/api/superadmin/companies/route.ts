import { withErrorHandling, requireSuperAdmin } from "@/server/api/helpers";
import { listAllCompaniesForSuperAdmin } from "@/server/services/platform-admin";

export async function GET() {
  return withErrorHandling(async () => {
    await requireSuperAdmin();
    const companies = await listAllCompaniesForSuperAdmin();
    return { companies };
  });
}
