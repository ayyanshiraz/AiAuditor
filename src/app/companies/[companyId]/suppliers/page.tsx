import { listSuppliers, getSupplierBalance } from "@/server/services/parties";
import { getCompany } from "@/server/services/companies";
import { PartiesClient } from "@/components/accounting/parties-client";

export default async function SuppliersPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const [company, suppliers] = await Promise.all([getCompany(companyId), listSuppliers(companyId)]);
  const withBalances = await Promise.all(suppliers.map(async (s) => ({ ...s, balance: await getSupplierBalance(companyId, s.id) })));

  return (
    <PartiesClient
      companyId={companyId}
      currency={company.baseCurrency}
      kind="suppliers"
      title="Suppliers"
      balanceLabel="Outstanding Payable"
      initialRows={withBalances}
    />
  );
}
