import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { accountingPeriods, auditLogs, journalEntries } from "@/server/db/schema";
import { NotFoundError, ValidationError } from "@/lib/errors";

export async function listPeriods(companyId: string) {
  return db
    .select()
    .from(accountingPeriods)
    .where(eq(accountingPeriods.companyId, companyId))
    .orderBy(accountingPeriods.startDate);
}

export async function createPeriod(
  companyId: string,
  data: { name: string; startDate: Date; endDate: Date }
) {
  const [row] = await db
    .insert(accountingPeriods)
    .values({ companyId, ...data, status: "OPEN" })
    .returning();
  return row;
}

/** Generates 12 monthly periods for a financial year starting at the given date. */
export async function generateMonthlyPeriods(companyId: string, fyStart: Date) {
  const periods = [];
  for (let i = 0; i < 12; i++) {
    const start = new Date(fyStart);
    start.setMonth(start.getMonth() + i);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0); // last day of month
    const name = start.toLocaleString("en-US", { month: "long", year: "numeric" });
    periods.push({ companyId, name, startDate: start, endDate: end, status: "OPEN" as const });
  }
  return db.insert(accountingPeriods).values(periods).returning();
}

export async function closePeriod(companyId: string, periodId: string, userId: string) {
  const [period] = await db
    .select()
    .from(accountingPeriods)
    .where(and(eq(accountingPeriods.id, periodId), eq(accountingPeriods.companyId, companyId)));
  if (!period) throw new NotFoundError("Accounting period");
  if (period.status === "CLOSED" || period.status === "LOCKED") {
    throw new ValidationError("Period is already closed.");
  }

  const [updated] = await db
    .update(accountingPeriods)
    .set({ status: "CLOSED", closedAt: new Date(), closedBy: userId })
    .where(eq(accountingPeriods.id, periodId))
    .returning();

  await db.insert(auditLogs).values({
    companyId,
    userId,
    action: "PERIOD_CLOSED",
    entityType: "AccountingPeriod",
    entityId: periodId,
    newValue: { status: "CLOSED" },
  });

  return updated;
}

/** Reopening a closed period requires elevated permission — enforced by the caller (route-level role check). */
export async function reopenPeriod(companyId: string, periodId: string, userId: string) {
  const [period] = await db
    .select()
    .from(accountingPeriods)
    .where(and(eq(accountingPeriods.id, periodId), eq(accountingPeriods.companyId, companyId)));
  if (!period) throw new NotFoundError("Accounting period");
  if (period.status === "LOCKED") {
    throw new ValidationError("Locked periods cannot be reopened.");
  }

  const [updated] = await db
    .update(accountingPeriods)
    .set({ status: "OPEN", closedAt: null, closedBy: null })
    .where(eq(accountingPeriods.id, periodId))
    .returning();

  await db.insert(auditLogs).values({
    companyId,
    userId,
    action: "PERIOD_REOPENED",
    entityType: "AccountingPeriod",
    entityId: periodId,
    newValue: { status: "OPEN" },
  });

  return updated;
}

export async function lockPeriod(companyId: string, periodId: string, userId: string) {
  const [updated] = await db
    .update(accountingPeriods)
    .set({ status: "LOCKED" })
    .where(and(eq(accountingPeriods.id, periodId), eq(accountingPeriods.companyId, companyId)))
    .returning();
  if (!updated) throw new NotFoundError("Accounting period");

  await db.insert(auditLogs).values({
    companyId,
    userId,
    action: "PERIOD_LOCKED",
    entityType: "AccountingPeriod",
    entityId: periodId,
    newValue: { status: "LOCKED" },
  });

  return updated;
}
