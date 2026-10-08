import { getCompany } from "@/server/services/companies";
import { LedgerView } from "@/components/accounting/ledger-view";

export default async function LedgerPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const company = await getCompany(companyId);
  return <LedgerView companyId={companyId} currency={company.baseCurrency} />;
}
