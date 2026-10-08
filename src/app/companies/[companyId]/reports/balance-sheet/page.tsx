import Link from "next/link";
import { getCompany } from "@/server/services/companies";
import { getBalanceSheet } from "@/server/services/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { money } from "@/components/format";
import { ReportToolbar } from "@/components/accounting/report-toolbar";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export default async function BalanceSheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ asOf?: string }>;
}) {
  const { companyId } = await params;
  const { asOf } = await searchParams;
  const company = await getCompany(companyId);
  const asOfDate = asOf ? new Date(asOf) : new Date();
  const report = await getBalanceSheet(companyId, asOfDate);
  const currency = company.baseCurrency;

  return (
    <div className="flex flex-col gap-4">
      <ReportToolbar dateFields={[{ name: "asOf", label: "As of", value: asOf }]} />

      <Card id="report-content">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{company.name} — Balance Sheet</CardTitle>
            <p className="text-xs text-[var(--muted-foreground)]">
              As of {asOfDate.toLocaleDateString()} · {currency} · Generated {new Date().toLocaleString()}
            </p>
          </div>
          {report.isBalanced ? (
            <Badge variant="success">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Assets = Liabilities + Equity
            </Badge>
          ) : (
            <Badge variant="danger">
              <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Out of balance
            </Badge>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-8 text-sm md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 font-semibold">Current Assets</p>
              <Rows rows={report.assets.current} currency={currency} companyId={companyId} />
              <p className="mb-2 mt-4 font-semibold">Non-Current Assets</p>
              <Rows rows={report.assets.nonCurrent} currency={currency} companyId={companyId} />
            </div>
            <div className="flex justify-between border-t-2 border-[var(--border-strong)] pt-2 text-base font-semibold">
              <span>Total Assets</span>
              <span className="tabular-nums">{money(report.assets.total, currency)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 font-semibold">Current Liabilities</p>
              <Rows rows={report.liabilities.current} currency={currency} companyId={companyId} />
              <p className="mb-2 mt-4 font-semibold">Non-Current Liabilities</p>
              <Rows rows={report.liabilities.nonCurrent} currency={currency} companyId={companyId} />
            </div>
            <div className="flex justify-between border-t border-[var(--border)] pt-2 font-medium">
              <span>Total Liabilities</span>
              <span className="tabular-nums">{money(report.liabilities.total, currency)}</span>
            </div>

            <div>
              <p className="mb-2 font-semibold">Equity</p>
              <Rows rows={report.equity.rows} currency={currency} companyId={companyId} />
              <div className="flex justify-between pl-2">
                <span className="text-[var(--muted-foreground)]">Current Year Earnings</span>
                <span className="tabular-nums">{money(report.equity.currentYearEarnings, currency)}</span>
              </div>
            </div>
            <div className="flex justify-between border-t border-[var(--border)] pt-2 font-medium">
              <span>Total Equity</span>
              <span className="tabular-nums">{money(report.equity.total, currency)}</span>
            </div>

            <div className="flex justify-between border-t-2 border-[var(--border-strong)] pt-2 text-base font-semibold">
              <span>Total Liabilities &amp; Equity</span>
              <span className="tabular-nums">{money(report.totalLiabilitiesAndEquity, currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Rows({
  rows,
  currency,
  companyId,
}: {
  rows: { accountId: string; name: string; amount: string }[];
  currency: string;
  companyId: string;
}) {
  if (rows.length === 0) return <p className="pl-2 text-[var(--muted-foreground)]">—</p>;
  return (
    <div className="flex flex-col gap-1 pl-2">
      {rows.map((r) => (
        <div key={r.accountId} className="flex justify-between">
          <Link href={`/companies/${companyId}/accounts/${r.accountId}`} className="text-[var(--muted-foreground)] hover:underline">
            {r.name}
          </Link>
          <span className="tabular-nums">{money(r.amount, currency)}</span>
        </div>
      ))}
    </div>
  );
}
