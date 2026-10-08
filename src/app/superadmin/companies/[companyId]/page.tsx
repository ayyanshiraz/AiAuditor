import { listCompanyUsersForSuperAdmin } from "@/server/services/platform-admin";
import { CompanyUsersClient } from "./company-users-client";

export default async function SuperAdminCompanyPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const detail = await listCompanyUsersForSuperAdmin(companyId);

  return (
    <CompanyUsersClient
      company={{
        id: detail.company.id,
        name: detail.company.name,
        legalName: detail.company.legalName,
        businessType: detail.company.businessType,
        registrationNumber: detail.company.registrationNumber,
        taxNumber: detail.company.taxNumber,
        address: detail.company.address,
        country: detail.company.country,
        city: detail.company.city,
        phone: detail.company.phone,
        email: detail.company.email,
        website: detail.company.website,
        baseCurrency: detail.company.baseCurrency,
        maxTeamMembers: detail.company.maxTeamMembers,
        archivedAt: detail.company.archivedAt ? detail.company.archivedAt.toISOString() : null,
        createdAt: detail.company.createdAt.toISOString(),
      }}
      owner={detail.owner}
      members={detail.members.map((m) => ({
        ...m,
        disabledAt: m.disabledAt ? m.disabledAt.toISOString() : null,
        joinedAt: m.joinedAt.toISOString(),
        lastActivity: m.lastActivity ? new Date(m.lastActivity).toISOString() : null,
      }))}
    />
  );
}
