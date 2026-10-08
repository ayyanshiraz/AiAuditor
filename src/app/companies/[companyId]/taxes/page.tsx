import { listTaxRates } from "@/server/services/taxes";
import { listAccounts } from "@/server/services/chart-of-accounts";
import { TaxesClient } from "./taxes-client";

export default async function TaxesPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const [taxRates, accounts] = await Promise.all([listTaxRates(companyId), listAccounts(companyId, { activeOnly: true })]);
  return <TaxesClient companyId={companyId} initialTaxRates={taxRates} accounts={accounts} />;
}
