import { listAllCompaniesForSuperAdmin } from "@/server/services/platform-admin";
import { CompaniesOverviewClient } from "./companies-overview-client";

export default async function SuperAdminCompaniesPage() {
  const companies = await listAllCompaniesForSuperAdmin();

  return (
    <CompaniesOverviewClient
      companies={companies.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        archivedAt: c.archivedAt ? c.archivedAt.toISOString() : null,
        lastActivity: c.lastActivity ? new Date(c.lastActivity).toISOString() : null,
      }))}
    />
  );
}
