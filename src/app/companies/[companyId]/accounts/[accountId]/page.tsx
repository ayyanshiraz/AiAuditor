import { getCompany } from "@/server/services/companies";
import { LedgerView } from "@/components/accounting/ledger-view";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ companyId: string; accountId: string }>;
}) {
  const { companyId, accountId } = await params;
  const company = await getCompany(companyId);
  return <LedgerView companyId={companyId} currency={company.baseCurrency} initialAccountId={accountId} />;
}
