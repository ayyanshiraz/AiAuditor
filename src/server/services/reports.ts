import { and, eq, gte, lte, lt, sql, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { journalLines, journalEntries, glAccounts } from "@/server/db/schema";
import { toCents, fromCents } from "@/lib/money";
import type { AccountType } from "@/types/accounting";

/* ------------------------------------------------------------------ */
/*  Shared: aggregate posted debit/credit totals per account           */
/* ------------------------------------------------------------------ */

interface AccountBalance {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  subtype: string | null;
  normalBalance: "DEBIT" | "CREDIT";
  isCashOrBank: boolean;
  debit: number; // cents
  credit: number; // cents
}

/**
 * Sums posted journal-line debits/credits per account for a company,
 * optionally bounded by a date range (inclusive). This is the single
 * low-level aggregation every report is built from — always DB-side.
 */
async function aggregateAccountBalances(
  companyId: string,
  opts?: { from?: Date; to?: Date }
): Promise<AccountBalance[]> {
  const accounts = await db
    .select()
    .from(glAccounts)
    .where(eq(glAccounts.companyId, companyId));

  const lineConditions = [
    eq(glAccounts.companyId, companyId),
    eq(journalEntries.status, "POSTED"),
  ];
  if (opts?.from) lineConditions.push(gte(journalEntries.entryDate, opts.from));
  if (opts?.to) lineConditions.push(lte(journalEntries.entryDate, opts.to));

  const postings = await db
    .select({
      accountId: journalLines.accountId,
      debit: sql<string>`COALESCE(SUM(${journalLines.debit}), 0)`,
      credit: sql<string>`COALESCE(SUM(${journalLines.credit}), 0)`,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
    .innerJoin(glAccounts, eq(glAccounts.id, journalLines.accountId))
    .where(and(...lineConditions))
    .groupBy(journalLines.accountId);

  const postingMap = new Map(postings.map((p) => [p.accountId, p]));

  return accounts.map((a) => {
    const p = postingMap.get(a.id);
    return {
      accountId: a.id,
      code: a.code,
      name: a.name,
      type: a.type as AccountType,
      subtype: a.subtype,
      normalBalance: a.normalBalance as "DEBIT" | "CREDIT",
      isCashOrBank: a.isCashOrBank,
      debit: toCents(p?.debit ?? "0"),
      credit: toCents(p?.credit ?? "0"),
    };
  });
}

// Categories whose "natural" positive direction is a debit balance. Used for
// category-level totals (Balance Sheet, Income Statement) so that a
// contra-account — one whose OWN normalBalance differs from the rest of its
// category, e.g. Accumulated Depreciation (type ASSET, normalBalance CREDIT)
// or Drawings (type EQUITY, normalBalance DEBIT) — nets out as a negative
// figure within its category instead of being added the wrong way.
const DEBIT_NORMAL_CATEGORIES: AccountType[] = ["ASSET", "EXPENSE", "COGS"];

function categoryNetCents(a: AccountBalance, category: AccountType): number {
  const net = a.debit - a.credit;
  return DEBIT_NORMAL_CATEGORIES.includes(category) ? net : -net;
}

/* ------------------------------------------------------------------ */
/*  TRIAL BALANCE                                                       */
/* ------------------------------------------------------------------ */

export async function getTrialBalance(companyId: string, asOfDate?: Date) {
  const balances = await aggregateAccountBalances(companyId, { to: asOfDate });

  const rows = balances
    .filter((b) => b.debit !== 0 || b.credit !== 0)
    .map((b) => {
      // Trial balance columns follow the RAW debit/credit net, not the
      // normal-balance-adjusted figure: a positive net (debit > credit)
      // always lists under Debit, negative always under Credit — that is
      // what "trial balance" means, independent of each account's normal side.
      const rawNet = b.debit - b.credit;
      return {
        accountId: b.accountId,
        code: b.code,
        name: b.name,
        type: b.type,
        debitBalance: rawNet > 0 ? fromCents(rawNet) : fromCents(0),
        creditBalance: rawNet < 0 ? fromCents(-rawNet) : fromCents(0),
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));

  const totalDebit = rows.reduce((s, r) => s + toCents(r.debitBalance), 0);
  const totalCredit = rows.reduce((s, r) => s + toCents(r.creditBalance), 0);

  return {
    rows,
    totalDebit: fromCents(totalDebit),
    totalCredit: fromCents(totalCredit),
    isBalanced: totalDebit === totalCredit,
  };
}

/* ------------------------------------------------------------------ */
/*  GENERAL LEDGER (single account)                                     */
/* ------------------------------------------------------------------ */

export async function getAccountLedger(
  companyId: string,
  accountId: string,
  opts: { from?: Date; to?: Date }
) {
  const [account] = await db
    .select()
    .from(glAccounts)
    .where(and(eq(glAccounts.id, accountId), eq(glAccounts.companyId, companyId)));
  if (!account) throw new Error("Account not found");

  // Opening balance = net balance of all posted activity strictly before `from`.
  let openingCents = 0;
  if (opts.from) {
    const priorConditions = [
      eq(journalLines.accountId, accountId),
      eq(journalEntries.status, "POSTED"),
      lt(journalEntries.entryDate, opts.from),
    ];
    const [prior] = await db
      .select({
        debit: sql<string>`COALESCE(SUM(${journalLines.debit}), 0)`,
        credit: sql<string>`COALESCE(SUM(${journalLines.credit}), 0)`,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
      .where(and(...priorConditions));

    const debit = toCents(prior?.debit ?? 0);
    const credit = toCents(prior?.credit ?? 0);
    openingCents = account.normalBalance === "DEBIT" ? debit - credit : credit - debit;
  }

  const conditions = [
    eq(journalLines.accountId, accountId),
    eq(journalEntries.status, "POSTED"),
  ];
  if (opts.from) conditions.push(gte(journalEntries.entryDate, opts.from));
  if (opts.to) conditions.push(lte(journalEntries.entryDate, opts.to));

  const lines = await db
    .select({
      lineId: journalLines.id,
      date: journalEntries.entryDate,
      entryNumber: journalEntries.entryNumber,
      journalEntryId: journalEntries.id,
      reference: journalEntries.reference,
      description: journalLines.description,
      entryDescription: journalEntries.description,
      debit: journalLines.debit,
      credit: journalLines.credit,
      transactionType: journalEntries.transactionType,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
    .where(and(...conditions))
    .orderBy(journalEntries.entryDate, journalEntries.entryNumber);

  let running = openingCents;
  const rows = lines.map((l) => {
    const debit = toCents(l.debit);
    const credit = toCents(l.credit);
    running += account.normalBalance === "DEBIT" ? debit - credit : credit - debit;
    return {
      date: l.date,
      journalEntryId: l.journalEntryId,
      entryNumber: l.entryNumber,
      reference: l.reference,
      description: l.description || l.entryDescription,
      transactionType: l.transactionType,
      debit: fromCents(debit),
      credit: fromCents(credit),
      runningBalance: fromCents(running),
    };
  });

  return {
    account,
    openingBalance: fromCents(openingCents),
    closingBalance: fromCents(running),
    lines: rows,
  };
}

/* ------------------------------------------------------------------ */
/*  INCOME STATEMENT                                                    */
/* ------------------------------------------------------------------ */

export async function getIncomeStatement(companyId: string, from: Date, to: Date) {
  const balances = await aggregateAccountBalances(companyId, { from, to });

  const byType = (type: AccountType) =>
    balances
      .filter((b) => b.type === type && (b.debit !== 0 || b.credit !== 0))
      .map((b) => ({
        accountId: b.accountId,
        code: b.code,
        name: b.name,
        amount: fromCents(categoryNetCents(b, type)),
      }))
      .sort((a, b) => a.code.localeCompare(b.code));

  const revenue = byType("REVENUE");
  const cogs = byType("COGS");
  const expenses = byType("EXPENSE");

  const sum = (rows: { amount: string }[]) => rows.reduce((s, r) => s + toCents(r.amount), 0);

  const totalRevenue = sum(revenue);
  const totalCogs = sum(cogs);
  const grossProfit = totalRevenue - totalCogs;
  const totalExpenses = sum(expenses);
  const operatingProfit = grossProfit - totalExpenses;
  // "Other income/expense" bucket = OTHER_REVENUE(4900)/OTHER_EXPENSE lines already
  // included above by account; kept net profit == operating profit here since
  // we classify all revenue/expense accounts uniformly (no separate "other" bucket
  // beyond the "Other Revenue"/"Other Expenses" GL accounts already listed).
  const netProfit = operatingProfit;

  return {
    period: { from, to },
    revenue,
    totalRevenue: fromCents(totalRevenue),
    cogs,
    totalCogs: fromCents(totalCogs),
    grossProfit: fromCents(grossProfit),
    expenses,
    totalExpenses: fromCents(totalExpenses),
    operatingProfit: fromCents(operatingProfit),
    netProfit: fromCents(netProfit),
  };
}

/* ------------------------------------------------------------------ */
/*  BALANCE SHEET                                                       */
/* ------------------------------------------------------------------ */

export async function getBalanceSheet(companyId: string, asOfDate: Date) {
  const balances = await aggregateAccountBalances(companyId, { to: asOfDate });

  const nonZero = (type: AccountType) =>
    balances.filter((b) => b.type === type && (b.debit !== 0 || b.credit !== 0));

  const mapRows = (rows: AccountBalance[], category: AccountType) =>
    rows
      .map((b) => ({
        accountId: b.accountId,
        code: b.code,
        name: b.name,
        subtype: b.subtype,
        amount: fromCents(categoryNetCents(b, category)),
      }))
      .sort((a, b) => a.code.localeCompare(b.code));

  const assetRows = mapRows(nonZero("ASSET"), "ASSET");
  const liabilityRows = mapRows(nonZero("LIABILITY"), "LIABILITY");
  const equityRows = mapRows(nonZero("EQUITY"), "EQUITY");

  const currentAssets = assetRows.filter((a) => a.subtype !== "Non-Current Asset");
  const nonCurrentAssets = assetRows.filter((a) => a.subtype === "Non-Current Asset");
  const currentLiabilities = liabilityRows.filter((l) => l.subtype !== "Non-Current Liability");
  const nonCurrentLiabilities = liabilityRows.filter((l) => l.subtype === "Non-Current Liability");

  const sum = (rows: { amount: string }[]) => rows.reduce((s, r) => s + toCents(r.amount), 0);
  const totalAssets = sum(assetRows);
  const totalLiabilities = sum(liabilityRows);

  // Current-year net earnings computed from revenue/COGS/expense accounts
  // year-to-date and rolled into equity as "Current Year Earnings" —
  // this keeps the equation balanced without a manual year-end closing entry.
  const fyStart = new Date(asOfDate.getFullYear(), 0, 1);
  const incomeStatement = await getIncomeStatement(companyId, fyStart, asOfDate);
  const currentYearEarnings = incomeStatement.netProfit;

  const totalEquity = sum(equityRows) + toCents(currentYearEarnings);

  return {
    asOfDate,
    assets: { current: currentAssets, nonCurrent: nonCurrentAssets, total: fromCents(totalAssets) },
    liabilities: {
      current: currentLiabilities,
      nonCurrent: nonCurrentLiabilities,
      total: fromCents(totalLiabilities),
    },
    equity: {
      rows: equityRows,
      currentYearEarnings,
      total: fromCents(totalEquity),
    },
    totalLiabilitiesAndEquity: fromCents(totalLiabilities + toCents(currentYearEarnings) + sum(equityRows)),
    isBalanced: totalAssets === totalLiabilities + toCents(currentYearEarnings) + sum(equityRows),
  };
}

/* ------------------------------------------------------------------ */
/*  CASH FLOW STATEMENT (indirect method)                               */
/* ------------------------------------------------------------------ */

const INVESTING_TYPES = ["ASSET_PURCHASE", "ASSET_DISPOSAL", "EQUIPMENT_PURCHASE"];
const FINANCING_TYPES = [
  "OWNER_INVESTMENT",
  "OWNER_DRAWINGS",
  "LOAN_RECEIVED",
  "LOAN_PAYMENT",
];

export async function getCashFlowStatement(companyId: string, from: Date, to: Date) {
  const cashAccounts = await db
    .select()
    .from(glAccounts)
    .where(and(eq(glAccounts.companyId, companyId), eq(glAccounts.isCashOrBank, true)));
  const cashAccountIds = cashAccounts.map((a) => a.id);

  if (cashAccountIds.length === 0) {
    return {
      period: { from, to },
      openingCash: "0.00",
      closingCash: "0.00",
      operating: { rows: [], total: "0.00" },
      investing: { rows: [], total: "0.00" },
      financing: { rows: [], total: "0.00" },
      reconciles: true,
      actualClosingCash: "0.00",
    };
  }

  // Opening cash = net balance of cash/bank accounts strictly before `from`,
  // PLUS the cash effect of any OPENING_BALANCE entries. Opening-balance
  // entries establish the books' starting position rather than in-period
  // cash flow activity, so they belong in the opening figure even when
  // (as for a company's very first period) they happen to be dated exactly
  // on `from` itself — otherwise they'd be excluded from "opening" (dated
  // on, not before, `from`) yet also excluded from operating/investing/
  // financing classification below, or worse, misclassified as operating
  // activity and double-counted against the opening balance they represent.
  const openingBalances = await Promise.all(
    cashAccountIds.map(async (id) => {
      const ledger = await getAccountLedger(companyId, id, { from });
      return toCents(ledger.openingBalance);
    })
  );
  // Bounded to [from, to] and not < from, since anything strictly before
  // `from` is already captured by the ledger-based openingBalances above —
  // this only picks up OPENING_BALANCE entries dated ON OR AFTER `from`
  // (the common case: a company's first period, whose opening entry shares
  // its start date) so they're counted once, as opening, never as movement.
  const [openingBalanceEntryEffect] = await db
    .select({
      debit: sql<string>`COALESCE(SUM(${journalLines.debit}), 0)`,
      credit: sql<string>`COALESCE(SUM(${journalLines.credit}), 0)`,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
    .where(
      and(
        inArray(journalLines.accountId, cashAccountIds),
        eq(journalEntries.status, "POSTED"),
        eq(journalEntries.transactionType, "OPENING_BALANCE"),
        gte(journalEntries.entryDate, from),
        lte(journalEntries.entryDate, to)
      )
    );
  const openingBalanceEntryCents =
    toCents(openingBalanceEntryEffect?.debit ?? "0") - toCents(openingBalanceEntryEffect?.credit ?? "0");
  const openingCents = openingBalances.reduce((s, v) => s + v, 0) + openingBalanceEntryCents;

  // Every posted line touching a cash/bank account in range, grouped by
  // the journal entry's transaction type to classify into operating /
  // investing / financing per the standard categorization rules.
  // OPENING_BALANCE entries are excluded — they're folded into openingCents
  // above, not treated as period movement.
  const rows = await db
    .select({
      transactionType: journalEntries.transactionType,
      debit: sql<string>`COALESCE(SUM(${journalLines.debit}), 0)`,
      credit: sql<string>`COALESCE(SUM(${journalLines.credit}), 0)`,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
    .where(
      and(
        inArray(journalLines.accountId, cashAccountIds),
        eq(journalEntries.status, "POSTED"),
        gte(journalEntries.entryDate, from),
        lte(journalEntries.entryDate, to)
      )
    )
    .groupBy(journalEntries.transactionType);

  const byType = rows
    .filter((r) => r.transactionType !== "OPENING_BALANCE")
    .map((r) => ({
      transactionType: r.transactionType,
      netCents: toCents(r.debit) - toCents(r.credit), // cash inflow positive
    }));

  const investing = byType.filter((r) => INVESTING_TYPES.includes(r.transactionType));
  const financing = byType.filter((r) => FINANCING_TYPES.includes(r.transactionType));
  const operating = byType.filter(
    (r) => !INVESTING_TYPES.includes(r.transactionType) && !FINANCING_TYPES.includes(r.transactionType)
  );

  const toRows = (list: typeof byType) =>
    list.map((r) => ({ label: humanizeType(r.transactionType), amount: fromCents(r.netCents) }));

  const sumNet = (list: typeof byType) => list.reduce((s, r) => s + r.netCents, 0);

  const operatingTotal = sumNet(operating);
  const investingTotal = sumNet(investing);
  const financingTotal = sumNet(financing);
  const closingCents = openingCents + operatingTotal + investingTotal + financingTotal;

  // Reconcile against actual closing cash/bank ledger balance.
  const closingBalances = await Promise.all(
    cashAccountIds.map(async (id) => {
      const ledger = await getAccountLedger(companyId, id, { to });
      return toCents(ledger.closingBalance);
    })
  );
  const actualClosing = closingBalances.reduce((s, v) => s + v, 0);

  return {
    period: { from, to },
    openingCash: fromCents(openingCents),
    closingCash: fromCents(closingCents),
    operating: { rows: toRows(operating), total: fromCents(operatingTotal) },
    investing: { rows: toRows(investing), total: fromCents(investingTotal) },
    financing: { rows: toRows(financing), total: fromCents(financingTotal) },
    reconciles: closingCents === actualClosing,
    actualClosingCash: fromCents(actualClosing),
  };
}

function humanizeType(type: string) {
  return type
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}
