import "dotenv/config";
import { db } from "@/server/db";
import { companies } from "@/server/db/schema";
import { desc } from "drizzle-orm";
import { getTrialBalance, getIncomeStatement, getBalanceSheet, getCashFlowStatement } from "@/server/services/reports";

async function main() {
  const [company] = await db.select().from(companies).orderBy(desc(companies.createdAt)).limit(1);
  console.log("Company:", company.name, company.id);

  const now = new Date();
  const fyStart = new Date(now.getFullYear(), 0, 1);

  const tb = await getTrialBalance(company.id, now);
  console.log("\n--- TRIAL BALANCE ---");
  for (const r of tb.rows) console.log(r.code, r.name, "D:", r.debitBalance, "C:", r.creditBalance);
  console.log("Total Debit:", tb.totalDebit, "Total Credit:", tb.totalCredit, "Balanced:", tb.isBalanced);

  const is_ = await getIncomeStatement(company.id, fyStart, now);
  console.log("\n--- INCOME STATEMENT ---");
  console.log("Revenue:", is_.totalRevenue, "COGS:", is_.totalCogs, "Gross Profit:", is_.grossProfit);
  console.log("Expenses:", is_.totalExpenses, "Operating Profit:", is_.operatingProfit, "Net Profit:", is_.netProfit);

  const bs = await getBalanceSheet(company.id, now);
  console.log("\n--- BALANCE SHEET ---");
  console.log("Total Assets:", bs.assets.total);
  console.log("Total Liabilities:", bs.liabilities.total);
  console.log("Total Equity:", bs.equity.total, "(current year earnings:", bs.equity.currentYearEarnings, ")");
  console.log("Assets = Liabilities + Equity ?", bs.isBalanced, bs.totalLiabilitiesAndEquity);

  const cf = await getCashFlowStatement(company.id, fyStart, now);
  console.log("\n--- CASH FLOW ---");
  console.log("Opening cash:", cf.openingCash);
  console.log("Operating:", cf.operating.total, "Investing:", cf.investing.total, "Financing:", cf.financing.total);
  console.log("Closing cash:", cf.closingCash, "Reconciles:", cf.reconciles, "Actual:", cf.actualClosingCash);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
