import { listAccounts } from "@/server/services/chart-of-accounts";
import { AccountsClient } from "./accounts-client";

export default async function AccountsPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const accounts = await listAccounts(companyId);
  return <AccountsClient companyId={companyId} initialAccounts={accounts} />;
}
