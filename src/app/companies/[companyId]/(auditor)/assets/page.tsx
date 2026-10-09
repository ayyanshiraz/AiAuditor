import { listAssets } from "@/server/services/assets";
import { listAccounts } from "@/server/services/chart-of-accounts";
import { listSuppliers } from "@/server/services/parties";
import { getCompany } from "@/server/services/companies";
import { AssetsClient } from "./assets-client";

export default async function AssetsPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const [company, assets, accounts, suppliers] = await Promise.all([
    getCompany(companyId),
    listAssets(companyId),
    listAccounts(companyId, { activeOnly: true }),
    listSuppliers(companyId),
  ]);

  return (
    <AssetsClient
      companyId={companyId}
      currency={company.baseCurrency}
      initialAssets={assets.map((a) => ({ ...a, purchaseDate: a.purchaseDate.toISOString() }))}
      accounts={accounts}
      suppliers={suppliers}
    />
  );
}
