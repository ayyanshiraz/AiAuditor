import { withErrorHandling, requireCompanyUserId } from "@/server/api/helpers";
import { getBalanceSheet, getIncomeStatement, getTrialBalance } from "@/server/services/reports";
import { listJournalEntries } from "@/server/services/journal";
import { listPeriods } from "@/server/services/periods";
import { getMonthlyTrend, getReceivablesAging, getPayablesAging } from "@/server/services/dashboard";
import { listEmployees, listCustomers, listSuppliers } from "@/server/services/parties";
import { db } from "@/server/db";
import { glAccounts, journalEntries } from "@/server/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { toCents, fromCents } from "@/lib/money";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    await requireCompanyUserId(companyId);

    const now = new Date();
    const fyStart = new Date(now.getFullYear(), 0, 1);

    const [balanceSheet, incomeStatement, trialBalance, recent, periods, trend, receivablesAging, payablesAging, employees, customers, suppliers] =
      await Promise.all([
        getBalanceSheet(companyId, now),
        getIncomeStatement(companyId, fyStart, now),
        getTrialBalance(companyId, now),
        listJournalEntries({ companyId, page: 1, pageSize: 10 }),
        listPeriods(companyId),
        getMonthlyTrend(companyId, 6),
        getReceivablesAging(companyId),
        getPayablesAging(companyId),
        listEmployees(companyId),
        listCustomers(companyId),
        listSuppliers(companyId),
      ]);

    // Cash & bank balances
    let cashBalance = "0.00";
    let bankBalance = "0.00";
    let receivable = "0.00";
    let payable = "0.00";
    try {
      const cashAccounts = await db
        .select()
        .from(glAccounts)
        .where(and(eq(glAccounts.companyId, companyId), eq(glAccounts.isCashOrBank, true)));
      const cashRow = balanceSheet.assets.current.find((a) => a.code === "1000");
      const bankRow = balanceSheet.assets.current.find((a) => a.code === "1010");
      cashBalance = cashRow?.amount ?? "0.00";
      bankBalance = bankRow?.amount ?? "0.00";
      const arRow = balanceSheet.assets.current.find((a) => a.code === "1100");
      receivable = arRow?.amount ?? "0.00";
      const apRow = balanceSheet.liabilities.current.find((l) => l.code === "2000");
      payable = apRow?.amount ?? "0.00";
    } catch {
      // Default company accounts may have been renamed/archived — fall back to zero.
    }

    const draftCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(journalEntries)
      .where(and(eq(journalEntries.companyId, companyId), eq(journalEntries.status, "DRAFT")));

    return {
      totals: {
        totalAssets: balanceSheet.assets.total,
        totalLiabilities: balanceSheet.liabilities.total,
        totalEquity: balanceSheet.equity.total,
        revenue: incomeStatement.totalRevenue,
        expenses: fromCents(toCents(incomeStatement.totalCogs) + toCents(incomeStatement.totalExpenses)),
        netProfit: incomeStatement.netProfit,
        cashBalance,
        bankBalance,
        accountsReceivable: receivable,
        accountsPayable: payable,
      },
      indicators: {
        booksBalanced: balanceSheet.isBalanced,
        trialBalanceBalanced: trialBalance.isBalanced,
        draftEntryCount: draftCount[0]?.count ?? 0,
        currentPeriod: periods.find((p) => p.status === "OPEN" && p.startDate <= now && p.endDate >= now)?.name ?? null,
        closedPeriodsCount: periods.filter((p) => p.status !== "OPEN").length,
      },
      recentTransactions: recent.rows,
      trend,
      receivablesAging,
      payablesAging,
      counts: {
        activeEmployees: employees.filter((e) => e.isActive).length,
        activeCustomers: customers.filter((c) => c.isActive).length,
        activeSuppliers: suppliers.filter((s) => s.isActive).length,
      },
    };
  });
}
