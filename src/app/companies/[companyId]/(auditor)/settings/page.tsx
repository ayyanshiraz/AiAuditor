import { getCompany, listCompanyMembers } from "@/server/services/companies";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const [company, members] = await Promise.all([getCompany(companyId), listCompanyMembers(companyId)]);

  return (
    <SettingsClient
      companyId={companyId}
      company={{
        name: company.name,
        legalName: company.legalName ?? "",
        businessType: company.businessType ?? "",
        registrationNumber: company.registrationNumber ?? "",
        taxNumber: company.taxNumber ?? "",
        address: company.address ?? "",
        country: company.country ?? "",
        city: company.city ?? "",
        phone: company.phone ?? "",
        email: company.email ?? "",
        website: company.website ?? "",
        baseCurrency: company.baseCurrency,
        accountingMethod: company.accountingMethod,
      }}
      members={members}
    />
  );
}
