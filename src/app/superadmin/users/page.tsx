import { listAllUsersForSuperAdmin } from "@/server/services/platform-admin";
import { UsersOverviewClient } from "./users-overview-client";

export default async function SuperAdminUsersPage() {
  const users = await listAllUsersForSuperAdmin();

  return (
    <UsersOverviewClient
      users={users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        disabledAt: u.disabledAt ? u.disabledAt.toISOString() : null,
        lastActivity: u.lastActivity ? new Date(u.lastActivity).toISOString() : null,
      }))}
    />
  );
}
