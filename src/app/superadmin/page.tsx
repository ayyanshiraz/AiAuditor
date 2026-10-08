import { getPlatformOverview, listAdmins } from "@/server/services/platform-admin";
import { OverviewClient } from "./overview-client";

export default async function SuperAdminOverviewPage() {
  const [overview, admins] = await Promise.all([getPlatformOverview(), listAdmins()]);

  return (
    <OverviewClient
      overview={{
        admins: overview.admins,
        companies: overview.companies,
        users: overview.users,
        recentActivity: overview.recentActivity.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
      }}
      admins={admins.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        disabledAt: a.disabledAt ? a.disabledAt.toISOString() : null,
        lastActivity: a.lastActivity ? new Date(a.lastActivity).toISOString() : null,
      }))}
    />
  );
}
