import { and, eq, gte, lte, desc, sql, or, ilike } from "drizzle-orm";
import { db } from "@/server/db";
import { journalEntries, journalLines, glAccounts, users } from "@/server/db/schema";
import { NotFoundError } from "@/lib/errors";

export interface JournalFilter {
  companyId: string;
  from?: Date;
  to?: Date;
  accountId?: string;
  transactionType?: string;
  status?: string;
  customerId?: string;
  supplierId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Server-side filtered & paginated journal listing (one row per entry). */
export async function listJournalEntries(filter: JournalFilter) {
  const page = filter.page ?? 1;
  const pageSize = Math.min(filter.pageSize ?? 50, 200);

  const conditions = [eq(journalEntries.companyId, filter.companyId)];
  if (filter.from) conditions.push(gte(journalEntries.entryDate, filter.from));
  if (filter.to) conditions.push(lte(journalEntries.entryDate, filter.to));
  if (filter.transactionType) conditions.push(eq(journalEntries.transactionType, filter.transactionType as never));
  if (filter.status) conditions.push(eq(journalEntries.status, filter.status as never));
  if (filter.search) {
    conditions.push(
      or(
        ilike(journalEntries.description, `%${filter.search}%`),
        ilike(journalEntries.entryNumber, `%${filter.search}%`),
        ilike(journalEntries.reference, `%${filter.search}%`)
      )!
    );
  }

  const base = db
    .select({
      id: journalEntries.id,
      entryNumber: journalEntries.entryNumber,
      entryDate: journalEntries.entryDate,
      description: journalEntries.description,
      reference: journalEntries.reference,
      transactionType: journalEntries.transactionType,
      status: journalEntries.status,
      createdByName: users.name,
      createdByEmail: users.email,
    })
    .from(journalEntries)
    .leftJoin(users, eq(users.id, journalEntries.createdBy))
    .where(and(...conditions))
    .orderBy(desc(journalEntries.entryDate), desc(journalEntries.entryNumber))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [rows, [{ count }]] = await Promise.all([
    base,
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(journalEntries)
      .where(and(...conditions)),
  ]);

  return { rows, total: count, page, pageSize };
}

export async function getJournalEntryDetail(companyId: string, entryId: string) {
  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, entryId), eq(journalEntries.companyId, companyId)));
  if (!entry) throw new NotFoundError("Journal entry");

  const lines = await db
    .select({
      id: journalLines.id,
      accountId: journalLines.accountId,
      accountCode: glAccounts.code,
      accountName: glAccounts.name,
      debit: journalLines.debit,
      credit: journalLines.credit,
      description: journalLines.description,
      customerId: journalLines.customerId,
      supplierId: journalLines.supplierId,
      employeeId: journalLines.employeeId,
      assetId: journalLines.assetId,
    })
    .from(journalLines)
    .innerJoin(glAccounts, eq(glAccounts.id, journalLines.accountId))
    .where(eq(journalLines.journalEntryId, entryId))
    .orderBy(journalLines.lineNumber);

  return { entry, lines };
}
