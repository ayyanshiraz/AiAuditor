import { listAccounts } from "@/server/services/chart-of-accounts";
import { listCustomers, listSuppliers } from "@/server/services/parties";
import { listEmployees } from "@/server/services/parties";
import { listTaxRates } from "@/server/services/taxes";
import { getCompany } from "@/server/services/companies";
import { EntriesClient } from "./entries-client";

export default async function EntriesPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const [company, accounts, customers, suppliers, employees, taxRates] = await Promise.all([
    getCompany(companyId),
    listAccounts(companyId, { activeOnly: true }),
    listCustomers(companyId),
    listSuppliers(companyId),
    listEmployees(companyId),
    listTaxRates(companyId),
  ]);

  return (
    <EntriesClient
      companyId={companyId}
      currency={company.baseCurrency}
      accounts={accounts}
      customers={customers}
      suppliers={suppliers}
      employees={employees}
      taxRates={taxRates}
    />
  );
}
