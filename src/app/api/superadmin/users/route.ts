import { withErrorHandling, requireSuperAdmin } from "@/server/api/helpers";
import { listAllUsersForSuperAdmin } from "@/server/services/platform-admin";

export async function GET() {
  return withErrorHandling(async () => {
    await requireSuperAdmin();
    const users = await listAllUsersForSuperAdmin();
    return { users };
  });
}
