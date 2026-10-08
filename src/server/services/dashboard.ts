import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { journalLines, journalEntries, glAccounts, customers, suppliers } from "@/server/db/schema";
import { toCents, fromCents } from "@/lib/money";

/* ------------------------------------------------------------------ */
/*  MONTHLY REVENUE / EXPENSE / NET PROFIT TREND                       */
/* ------------------------------------------------------------------ */

export interface MonthlyTrendPoint {
  month: string; // "2026-01"
  label: string; // "Jan 2026"
  revenue: string;
  expenses: string;
  netProfit: string;
}

/** Posted revenue/expense/COGS activity per calendar month, most recent `months` months (oldest first). */
export async function getMonthlyTrend(companyId: string, months = 6): Promise<MonthlyTrendPoint[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const rows = await db
    .select({
      month: sql<string>`to_char(${journalEntries.entryDate}, 'YYYY-MM')`,
      type: glAccounts.type,
      debit: sql<string>`COALESCE(SUM(${journalLines.debit}), 0)`,
      credit: sql<string>`COALESCE(SUM(${journalLines.credit}), 0)`,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
    .innerJoin(glAccounts, eq(glAccounts.id, journalLines.accountId))
    .where(
      and(
        eq(journalLines.companyId, companyId),
        eq(journalEntries.status, "POSTED"),
        gte(journalEntries.entryDate, start),
        sql`${glAccounts.type} IN ('REVENUE', 'EXPENSE', 'COGS')`
      )
    )
    .groupBy(sql`to_char(${journalEntries.entryDate}, 'YYYY-MM')`, glAccounts.type);

  const byMonth = new Map<string, { revenue: number; expenses: number }>();
  for (const r of rows) {
    const bucket = byMonth.get(r.month) ?? { revenue: 0, expenses: 0 };
    if (r.type === "REVENUE") {
      bucket.revenue += toCents(r.credit) - toCents(r.debit);
    } else {
      bucket.expenses += toCents(r.debit) - toCents(r.credit);
    }
    byMonth.set(r.month, bucket);
  }

  const points: MonthlyTrendPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = byMonth.get(key) ?? { revenue: 0, expenses: 0 };
    points.push({
      month: key,
      label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      revenue: fromCents(bucket.revenue),
      expenses: fromCents(bucket.expenses),
      netProfit: fromCents(bucket.revenue - bucket.expenses),
    });
  }
  return points;
}

/* ------------------------------------------------------------------ */
/*  AR / AP AGING                                                       */
/* ------------------------------------------------------------------ */

export interface AgingBucket {
  partyId: string;
  name: string;
  current: string; // 0-30 days
  days31to60: string;
  days61to90: string;
  over90: string;
  total: string;
}

export interface AgingSummary {
  buckets: { current: string; days31to60: string; days61to90: string; over90: string; total: string };
  topParties: AgingBucket[];
}

async function computeAging(
  companyId: string,
  kind: "customer" | "supplier"
): Promise<AgingSummary> {
  const partyIdCol = kind === "customer" ? journalLines.customerId : journalLines.supplierId;
  const nameTable = kind === "customer" ? customers : suppliers;

  const rows = await db
    .select({
      partyId: partyIdCol,
      entryDate: journalEntries.entryDate,
      debit: journalLines.debit,
      credit: journalLines.credit,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
    .where(
      and(
        eq(journalLines.companyId, companyId),
        eq(journalEntries.status, "POSTED"),
        isNotNull(partyIdCol)
      )
    );

  const names = await db.select({ id: nameTable.id, name: nameTable.name }).from(nameTable).where(eq(nameTable.companyId, companyId));
  const nameMap = new Map(names.map((n) => [n.id, n.name]));

  const now = Date.now();
  const byParty = new Map<string, { current: number; b31: number; b61: number; b90: number }>();

  for (const r of rows) {
    if (!r.partyId) continue;
    // Receivable (customer) is a debit-normal balance; payable (supplier) is credit-normal.
    const net = kind === "customer" ? toCents(r.debit) - toCents(r.credit) : toCents(r.credit) - toCents(r.debit);
    if (net === 0) continue;
    const ageDays = Math.floor((now - new Date(r.entryDate).getTime()) / 86400000);
    const bucket = byParty.get(r.partyId) ?? { current: 0, b31: 0, b61: 0, b90: 0 };
    if (ageDays <= 30) bucket.current += net;
    else if (ageDays <= 60) bucket.b31 += net;
    else if (ageDays <= 90) bucket.b61 += net;
    else bucket.b90 += net;
    byParty.set(r.partyId, bucket);
  }

  const partyRows: AgingBucket[] = [];
  let totCurrent = 0,
    totB31 = 0,
    totB61 = 0,
    totB90 = 0;

  for (const [partyId, b] of byParty) {
    const total = b.current + b.b31 + b.b61 + b.b90;
    if (total === 0) continue; // fully settled
    totCurrent += b.current;
    totB31 += b.b31;
    totB61 += b.b61;
    totB90 += b.b90;
    partyRows.push({
      partyId,
      name: nameMap.get(partyId) ?? "Unknown",
      current: fromCents(b.current),
      days31to60: fromCents(b.b31),
      days61to90: fromCents(b.b61),
      over90: fromCents(b.b90),
      total: fromCents(total),
    });
  }

  partyRows.sort((a, b) => parseFloat(b.total) - parseFloat(a.total));

  return {
    buckets: {
      current: fromCents(totCurrent),
      days31to60: fromCents(totB31),
      days61to90: fromCents(totB61),
      over90: fromCents(totB90),
      total: fromCents(totCurrent + totB31 + totB61 + totB90),
    },
    topParties: partyRows.slice(0, 5),
  };
}

export function getReceivablesAging(companyId: string) {
  return computeAging(companyId, "customer");
}

export function getPayablesAging(companyId: string) {
  return computeAging(companyId, "supplier");
}
