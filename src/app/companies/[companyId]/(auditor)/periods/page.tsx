import { listPeriods } from "@/server/services/periods";
import { PeriodsClient } from "./periods-client";

export default async function PeriodsPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const periods = await listPeriods(companyId);
  return (
    <PeriodsClient
      companyId={companyId}
      initialPeriods={periods.map((p) => ({ ...p, startDate: p.startDate.toISOString(), endDate: p.endDate.toISOString() }))}
    />
  );
}
