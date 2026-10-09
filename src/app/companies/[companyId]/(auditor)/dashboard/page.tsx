import Link from "next/link";
import { getBalanceSheet, getIncomeStatement, getTrialBalance } from "@/server/services/reports";
import { listJournalEntries } from "@/server/services/journal";
import { listPeriods } from "@/server/services/periods";
import { getCompany } from "@/server/services/companies";
import { getMonthlyTrend, getReceivablesAging, getPayablesAging, type AgingSummary } from "@/server/services/dashboard";
import { listEmployees, listCustomers, listSuppliers } from "@/server/services/parties";
import { db } from "@/server/db";
import { journalEntries } from "@/server/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { money, shortDate, humanizeType } from "@/components/format";
import { TrendChart } from "@/components/accounting/trend-chart";
import { CheckCircle2, AlertTriangle, Users, Building2, Wallet, TrendingUp, TrendingDown } from "lucide-react";

export default async function DashboardPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const company = await getCompany(companyId);
  const now = new Date();
  const fyStart = new Date(now.getFullYear(), 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    balanceSheet,
    incomeStatement,
    thisMonthIncome,
    lastMonthIncome,
    trialBalance,
    recent,
    periods,
    trend,
    receivablesAging,
    payablesAging,
    employees,
    customers,
    suppliers,
    draftCountRows,
  ] = await Promise.all([
    getBalanceSheet(companyId, now),
    getIncomeStatement(companyId, fyStart, now),
    getIncomeStatement(companyId, monthStart, now),
    getIncomeStatement(companyId, lastMonthStart, lastMonthEnd),
    getTrialBalance(companyId, now),
    listJournalEntries({ companyId, page: 1, pageSize: 8 }),
    listPeriods(companyId),
    getMonthlyTrend(companyId, 6),
    getReceivablesAging(companyId),
    getPayablesAging(companyId),
    listEmployees(companyId),
    listCustomers(companyId),
    listSuppliers(companyId),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(journalEntries)
      .where(and(eq(journalEntries.companyId, companyId), eq(journalEntries.status, "DRAFT"))),
  ]);

  const cash = balanceSheet.assets.current.find((a) => a.code === "1000")?.amount ?? "0.00";
  const bank = balanceSheet.assets.current.find((a) => a.code === "1010")?.amount ?? "0.00";
  const cashPosition = (parseFloat(cash) + parseFloat(bank)).toFixed(2);
  const ar = balanceSheet.assets.current.find((a) => a.code === "1100")?.amount ?? "0.00";
  const ap = balanceSheet.liabilities.current.find((l) => l.code === "2000")?.amount ?? "0.00";
  const currency = company.baseCurrency;
  const draftCount = draftCountRows[0]?.count ?? 0;

  const currentPeriod = periods.find((p) => p.status === "OPEN" && p.startDate <= now && p.endDate >= now);

  const thisMonthProfit = parseFloat(thisMonthIncome.netProfit);
  const lastMonthProfit = parseFloat(lastMonthIncome.netProfit);
  const profitDelta = lastMonthProfit !== 0 ? ((thisMonthProfit - lastMonthProfit) / Math.abs(lastMonthProfit)) * 100 : null;

  const heroStats = [
    { label: "Cash & Bank Position", value: cashPosition, icon: Wallet },
    { label: "Net Profit (YTD)", value: incomeStatement.netProfit, emphasize: true, icon: TrendingUp },
    { label: "Accounts Receivable", value: ar, icon: TrendingUp },
    { label: "Accounts Payable", value: ap, icon: TrendingDown },
  ];

  const quickActions = [
    { label: "Add General Entry", href: `/companies/${companyId}/entries` },
    { label: "Add Sale", href: `/companies/${companyId}/entries?kind=sale` },
    { label: "Add Expense", href: `/companies/${companyId}/entries?kind=expense` },
    { label: "Add Purchase", href: `/companies/${companyId}/entries?kind=purchase` },
    { label: "Add Asset", href: `/companies/${companyId}/assets` },
    { label: "Record Payment", href: `/companies/${companyId}/entries?kind=supplierPayment` },
    { label: "Record Receipt", href: `/companies/${companyId}/entries?kind=customerPayment` },
    { label: "Manual Journal", href: `/companies/${companyId}/journal` },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {heroStats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--muted-foreground)]">{s.label}</p>
                <s.icon className="h-4 w-4 text-[var(--muted-foreground)]" />
              </div>
              <p
                className={`mt-1 tabular-nums text-xl font-semibold ${
                  s.emphasize ? (parseFloat(s.value) >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]") : ""
                }`}
              >
                {money(s.value, currency)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* This month vs last month + company pulse */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[var(--muted-foreground)]">This Month's Profit</p>
            <p className={`mt-1 tabular-nums text-lg font-semibold ${thisMonthProfit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
              {money(thisMonthIncome.netProfit, currency)}
            </p>
            {profitDelta !== null && (
              <p className={`mt-0.5 text-xs ${profitDelta >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                {profitDelta >= 0 ? "▲" : "▼"} {Math.abs(profitDelta).toFixed(1)}% vs last month
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--muted-foreground)]">Employees</p>
              <Users className="h-4 w-4 text-[var(--muted-foreground)]" />
            </div>
            <p className="mt-1 tabular-nums text-lg font-semibold">{employees.filter((e) => e.isActive).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--muted-foreground)]">Customers / Suppliers</p>
              <Building2 className="h-4 w-4 text-[var(--muted-foreground)]" />
            </div>
            <p className="mt-1 tabular-nums text-lg font-semibold">
              {customers.filter((c) => c.isActive).length} / {suppliers.filter((s) => s.isActive).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[var(--muted-foreground)]">Draft Entries Awaiting Posting</p>
            <p className={`mt-1 tabular-nums text-lg font-semibold ${draftCount > 0 ? "text-[var(--warning)]" : ""}`}>{draftCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue, Expenses &amp; Net Profit — last 6 months</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={trend} currency={currency} />
        </CardContent>
      </Card>

      {/* AR / AP aging */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AgingCard title="Receivables aging (by customer)" aging={receivablesAging} currency={currency} companyId={companyId} kind="customers" />
        <AgingCard title="Payables aging (by supplier)" aging={payablesAging} currency={currency} companyId={companyId} kind="suppliers" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{shortDate(r.entryDate)}</TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      <Link href={`/companies/${companyId}/journal/${r.id}`} className="hover:underline">
                        {r.description}
                      </Link>
                    </TableCell>
                    <TableCell>{r.entryNumber}</TableCell>
                    <TableCell>{humanizeType(r.transactionType)}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {recent.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-[var(--muted-foreground)]">
                      No transactions yet. Add your first entry to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Books health</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <IndicatorRow label="Trial balance balanced" ok={trialBalance.isBalanced} />
              <IndicatorRow label="Balance sheet balanced" ok={balanceSheet.isBalanced} />
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted-foreground)]">Current period</span>
                <span>{currentPeriod?.name ?? "Not set"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted-foreground)]">Closed periods</span>
                <span>{periods.filter((p) => p.status !== "OPEN").length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {quickActions.map((a) => (
                <Button key={a.label} variant="outline" size="sm" asChild className="justify-start">
                  <Link href={a.href}>{a.label}</Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AgingCard({
  title,
  aging,
  currency,
  companyId,
  kind,
}: {
  title: string;
  aging: AgingSummary;
  currency: string;
  companyId: string;
  kind: "customers" | "suppliers";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div>
            <p className="text-[var(--muted-foreground)]">0-30 days</p>
            <p className="mt-1 font-semibold tabular-nums">{money(aging.buckets.current, currency)}</p>
          </div>
          <div>
            <p className="text-[var(--muted-foreground)]">31-60 days</p>
            <p className="mt-1 font-semibold tabular-nums">{money(aging.buckets.days31to60, currency)}</p>
          </div>
          <div>
            <p className="text-[var(--muted-foreground)]">61-90 days</p>
            <p className="mt-1 font-semibold tabular-nums">{money(aging.buckets.days61to90, currency)}</p>
          </div>
          <div>
            <p className="text-[var(--muted-foreground)]">90+ days</p>
            <p className="mt-1 font-semibold tabular-nums text-[var(--danger)]">{money(aging.buckets.over90, currency)}</p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aging.topParties.map((p) => (
              <TableRow key={p.partyId}>
                <TableCell>
                  <Link href={`/companies/${companyId}/${kind}/${p.partyId}`} className="hover:underline">
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(p.total, currency)}</TableCell>
              </TableRow>
            ))}
            {aging.topParties.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="py-6 text-center text-[var(--muted-foreground)]">
                  Nothing outstanding.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function IndicatorRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      {ok ? (
        <span className="flex items-center gap-1 text-[var(--success)]">
          <CheckCircle2 className="h-4 w-4" /> Balanced
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[var(--danger)]">
          <AlertTriangle className="h-4 w-4" /> Out of balance
        </span>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "POSTED" ? "success" : status === "DRAFT" ? "warning" : status === "VOIDED" ? "danger" : "outline";
  return <Badge variant={variant as never}>{status}</Badge>;
}
