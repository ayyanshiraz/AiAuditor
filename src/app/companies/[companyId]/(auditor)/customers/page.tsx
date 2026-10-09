import { listCustomers, getCustomerBalance } from "@/server/services/parties";
import { getCompany } from "@/server/services/companies";
import { PartiesClient } from "@/components/accounting/parties-client";

export default async function CustomersPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const [company, customers] = await Promise.all([getCompany(companyId), listCustomers(companyId)]);
  const withBalances = await Promise.all(customers.map(async (c) => ({ ...c, balance: await getCustomerBalance(companyId, c.id) })));

  return (
    <PartiesClient
      companyId={companyId}
      currency={company.baseCurrency}
      kind="customers"
      title="Customers"
      balanceLabel="Outstanding Receivable"
      initialRows={withBalances}
    />
  );
}
