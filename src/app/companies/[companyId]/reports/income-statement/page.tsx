import Link from "next/link";
import { getCompany } from "@/server/services/companies";
import { getIncomeStatement } from "@/server/services/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { money } from "@/components/format";
import { ReportToolbar } from "@/components/accounting/report-toolbar";

export default async function IncomeStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { companyId } = await params;
  const { from, to } = await searchParams;
  const company = await getCompany(companyId);
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), 0, 1);
  const fromDate = from ? new Date(from) : defaultFrom;
  const toDate = to ? new Date(to) : now;

  const report = await getIncomeStatement(companyId, fromDate, toDate);
  const currency = company.baseCurrency;

  return (
    <div className="flex flex-col gap-4">
      <ReportToolbar
        dateFields={[
          { name: "from", label: "From", value: from ?? defaultFrom.toISOString().slice(0, 10) },
          { name: "to", label: "To", value: to ?? now.toISOString().slice(0, 10) },
        ]}
      />

      <Card id="report-content">
        <CardHeader>
          <CardTitle>{company.name} — Income Statement</CardTitle>
          <p className="text-xs text-[var(--muted-foreground)]">
            {fromDate.toLocaleDateString()} – {toDate.toLocaleDateString()} · {currency} · Generated {new Date().toLocaleString()}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 text-sm">
          <Section title="Revenue" rows={report.revenue} total={report.totalRevenue} currency={currency} basePath={`/companies/${companyId}/accounts`} />
          <Section title="Cost of Goods Sold" rows={report.cogs} total={report.totalCogs} currency={currency} basePath={`/companies/${companyId}/accounts`} />
          <TotalLine label="Gross Profit" value={report.grossProfit} currency={currency} emphasize />
          <Section title="Operating Expenses" rows={report.expenses} total={report.totalExpenses} currency={currency} basePath={`/companies/${companyId}/accounts`} />
          <TotalLine label="Operating Profit" value={report.operatingProfit} currency={currency} emphasize />
          <div className="border-t border-[var(--border)] pt-3">
            <TotalLine label="Net Profit / (Loss)" value={report.netProfit} currency={currency} emphasize large />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({
  title,
  rows,
  total,
  currency,
  basePath,
}: {
  title: string;
  rows: { accountId: string; code: string; name: string; amount: string }[];
  total: string;
  currency: string;
  basePath: string;
}) {
  return (
    <div>
      <p className="mb-2 font-semibold">{title}</p>
      <div className="flex flex-col gap-1 pl-2">
        {rows.map((r) => (
          <div key={r.accountId} className="flex justify-between">
            <Link href={`${basePath}/${r.accountId}`} className="text-[var(--muted-foreground)] hover:underline">
              {r.name}
            </Link>
            <span className="tabular-nums">{money(r.amount, currency)}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="text-[var(--muted-foreground)]">No activity</p>}
      </div>
      <div className="mt-1 flex justify-between border-t border-[var(--border)] pt-1 pl-2 font-medium">
        <span>Total {title}</span>
        <span className="tabular-nums">{money(total, currency)}</span>
      </div>
    </div>
  );
}

function TotalLine({
  label,
  value,
  currency,
  emphasize,
  large,
}: {
  label: string;
  value: string;
  currency: string;
  emphasize?: boolean;
  large?: boolean;
}) {
  const n = parseFloat(value);
  return (
    <div className={`flex justify-between ${large ? "text-base" : ""} ${emphasize ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span className={`tabular-nums ${emphasize ? (n >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]") : ""}`}>
        {money(value, currency)}
      </span>
    </div>
  );
}
