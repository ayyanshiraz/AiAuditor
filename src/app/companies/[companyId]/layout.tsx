import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { getCompany, getCompanyMembership, listCompaniesForUser } from "@/server/services/companies";
import { AppShell } from "@/components/layout/app-shell";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");
  const isSuperAdmin = Boolean((session?.user as { isSuperAdmin?: boolean } | undefined)?.isSuperAdmin);

  const membership = await getCompanyMembership(companyId, userId);
  if (!membership && !isSuperAdmin) redirect("/companies");

  const [company, companies] = await Promise.all([getCompany(companyId), listCompaniesForUser(userId)]);

  return (
    <AppShell
      company={{ id: company.id, name: company.name, baseCurrency: company.baseCurrency }}
      role={membership?.role ?? "OWNER"}
      companies={companies.map((c) => ({ id: c.id, name: c.name }))}
      userName={session?.user?.name ?? session?.user?.email ?? ""}
      isSuperAdmin={isSuperAdmin}
      viewingAsSuperAdmin={isSuperAdmin && !membership}
    >
      {children}
    </AppShell>
  );
}
