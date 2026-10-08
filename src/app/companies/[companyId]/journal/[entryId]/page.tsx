import { getCompany } from "@/server/services/companies";
import { getJournalEntryDetail } from "@/server/services/journal";
import { listAccounts } from "@/server/services/chart-of-accounts";
import { EntryDetailClient } from "./entry-detail-client";

export default async function JournalEntryDetailPage({
  params,
}: {
  params: Promise<{ companyId: string; entryId: string }>;
}) {
  const { companyId, entryId } = await params;
  const [company, detail, accounts] = await Promise.all([
    getCompany(companyId),
    getJournalEntryDetail(companyId, entryId),
    listAccounts(companyId, { activeOnly: true }),
  ]);

  return (
    <EntryDetailClient
      companyId={companyId}
      currency={company.baseCurrency}
      entry={{ ...detail.entry, entryDate: detail.entry.entryDate.toISOString() }}
      lines={detail.lines}
      accounts={accounts.map((a) => ({ id: a.id, code: a.code, name: a.name }))}
    />
  );
}
