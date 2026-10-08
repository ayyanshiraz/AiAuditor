import { getCompany } from "@/server/services/companies";
import { getCashFlowStatement } from "@/server/services/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { money } from "@/components/format";
import { ReportToolbar } from "@/components/accounting/report-toolbar";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export default async function CashFlowPage({
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

  const report = await getCashFlowStatement(companyId, fromDate, toDate);
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{company.name} — Cash Flow Statement (Indirect Method)</CardTitle>
            <p className="text-xs text-[var(--muted-foreground)]">
              {fromDate.toLocaleDateString()} – {toDate.toLocaleDateString()} · {currency} · Generated {new Date().toLocaleString()}
            </p>
          </div>
          {report.reconciles ? (
            <Badge variant="success">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Reconciles with cash/bank
            </Badge>
          ) : (
            <Badge variant="danger">
              <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Reconciliation mismatch
            </Badge>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-6 text-sm">
          <div className="flex justify-between font-medium">
            <span>Opening Cash</span>
            <span className="tabular-nums">{money(report.openingCash, currency)}</span>
          </div>

          <Section title="Operating Activities" rows={report.operating.rows} total={report.operating.total} currency={currency} />
          <Section title="Investing Activities" rows={report.investing.rows} total={report.investing.total} currency={currency} />
          <Section title="Financing Activities" rows={report.financing.rows} total={report.financing.total} currency={currency} />

          <div className="border-t-2 border-[var(--border-strong)] pt-3 text-base font-semibold">
            <div className="flex justify-between">
              <span>Closing Cash</span>
              <span className="tabular-nums">{money(report.closingCash, currency)}</span>
            </div>
            {!report.reconciles && (
              <p className="mt-1 text-xs font-normal text-[var(--danger)]">
                Actual cash/bank ledger balance: {money(report.actualClosingCash, currency)}
              </p>
            )}
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
}: {
  title: string;
  rows: { label: string; amount: string }[];
  total: string;
  currency: string;
}) {
  return (
    <div>
      <p className="mb-2 font-semibold">{title}</p>
      <div className="flex flex-col gap-1 pl-2">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">{r.label}</span>
            <span className="tabular-nums">{money(r.amount, currency)}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="text-[var(--muted-foreground)]">No activity</p>}
      </div>
      <div className="mt-1 flex justify-between border-t border-[var(--border)] pt-1 pl-2 font-medium">
        <span>Net Cash from {title}</span>
        <span className="tabular-nums">{money(total, currency)}</span>
      </div>
    </div>
  );
}
