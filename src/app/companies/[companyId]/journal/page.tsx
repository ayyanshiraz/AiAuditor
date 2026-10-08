import { getCompany } from "@/server/services/companies";
import { JournalClient } from "./journal-client";

export default async function JournalPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const company = await getCompany(companyId);
  return <JournalClient companyId={companyId} currency={company.baseCurrency} />;
}
