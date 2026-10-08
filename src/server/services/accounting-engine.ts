import { and, eq, gte, lte, isNull, or } from "drizzle-orm";
import { db, type DbOrTx } from "@/server/db";
import {
  journalEntries,
  journalLines,
  glAccounts,
  accountingPeriods,
  auditLogs,
} from "@/server/db/schema";
import { sumCents, toCents, fromCents, isZeroCents } from "@/lib/money";
import {
  UnbalancedEntryError,
  ValidationError,
  PeriodClosedError,
  NotFoundError,
  ImmutableRecordError,
} from "@/lib/errors";
import { nextNumber } from "./numbering";
import type { TransactionType } from "@/types/accounting";

export interface JournalLineInput {
  accountId: string;
  debit?: number | string;
  credit?: number | string;
  description?: string;
  customerId?: string | null;
  supplierId?: string | null;
  employeeId?: string | null;
  assetId?: string | null;
  taxRateId?: string | null;
}

export interface CreateJournalEntryInput {
  companyId: string;
  entryDate: Date;
  transactionType: TransactionType;
  description: string;
  reference?: string;
  lines: JournalLineInput[];
  createdBy: string;
  sourceType?: string;
  sourceId?: string;
  numberPrefix?: string;
  autoPost?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Locates (or implicitly treats as open, if none configured yet) the
 * accounting period covering a given date, and throws if it is closed/locked.
 */
async function assertPeriodOpen(
  tx: DbOrTx,
  companyId: string,
  entryDate: Date
): Promise<string | null> {
  const [period] = await tx
    .select()
    .from(accountingPeriods)
    .where(
      and(
        eq(accountingPeriods.companyId, companyId),
        lte(accountingPeriods.startDate, entryDate),
        gte(accountingPeriods.endDate, entryDate)
      )
    )
    .limit(1);

  if (!period) return null; // No period configured for this date yet — allowed (pre-period-setup).
  if (period.status !== "OPEN") {
    throw new PeriodClosedError(period.name);
  }
  return period.id;
}

function validateLines(lines: JournalLineInput[]) {
  if (!lines || lines.length < 2) {
    throw new ValidationError(
      "A journal entry requires at least two lines (one debit and one credit)."
    );
  }

  let debitTotal = 0;
  let creditTotal = 0;

  for (const line of lines) {
    const debit = toCents(line.debit ?? 0);
    const credit = toCents(line.credit ?? 0);

    if (debit < 0 || credit < 0) {
      throw new ValidationError("Journal line amounts must be positive.");
    }
    if (debit > 0 && credit > 0) {
      throw new ValidationError(
        "A journal line cannot have both a debit and a credit amount."
      );
    }
    if (debit === 0 && credit === 0) {
      throw new ValidationError("A journal line must have a non-zero debit or credit amount.");
    }
    debitTotal += debit;
    creditTotal += credit;
  }

  if (debitTotal !== creditTotal) {
    throw new UnbalancedEntryError(fromCents(debitTotal), fromCents(creditTotal));
  }

  return { debitTotal, creditTotal };
}

/**
 * Creates a (draft or posted) journal entry with its lines, fully validated
 * and inside a single DB transaction. This is the ONLY path by which
 * journal data may be written — all transaction templates funnel through it.
 */
export async function createJournalEntry(input: CreateJournalEntryInput, existingTx?: DbOrTx) {
  validateLines(input.lines);

  const run = async (tx: DbOrTx) => {
    // Validate every account belongs to this company and is active.
    const accountIds = [...new Set(input.lines.map((l) => l.accountId))];
    const accounts = await tx
      .select()
      .from(glAccounts)
      .where(eq(glAccounts.companyId, input.companyId));

    const accountMap = new Map(accounts.map((a) => [a.id, a]));
    for (const id of accountIds) {
      const acc = accountMap.get(id);
      if (!acc) {
        throw new ValidationError("One or more selected accounts do not belong to this company.");
      }
      if (!acc.isActive) {
        throw new ValidationError(`Account "${acc.name}" is inactive and cannot be used in new transactions.`);
      }
    }

    const periodId = await assertPeriodOpen(tx, input.companyId, input.entryDate);

    const entryNumber = await nextNumber(
      tx,
      input.companyId,
      input.numberPrefix ?? "JE"
    );

    const [entry] = await tx
      .insert(journalEntries)
      .values({
        companyId: input.companyId,
        entryNumber,
        entryDate: input.entryDate,
        transactionType: input.transactionType,
        description: input.description,
        reference: input.reference,
        status: input.autoPost ? "POSTED" : "DRAFT",
        periodId: periodId ?? undefined,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        createdBy: input.createdBy,
        postedBy: input.autoPost ? input.createdBy : undefined,
        postedAt: input.autoPost ? new Date() : undefined,
      })
      .returning();

    await tx.insert(journalLines).values(
      input.lines.map((line, idx) => ({
        journalEntryId: entry.id,
        companyId: input.companyId,
        accountId: line.accountId,
        debit: fromCents(toCents(line.debit ?? 0)),
        credit: fromCents(toCents(line.credit ?? 0)),
        description: line.description,
        lineNumber: idx + 1,
        customerId: line.customerId ?? null,
        supplierId: line.supplierId ?? null,
        employeeId: line.employeeId ?? null,
        assetId: line.assetId ?? null,
        taxRateId: line.taxRateId ?? null,
      }))
    );

    await tx.insert(auditLogs).values({
      companyId: input.companyId,
      userId: input.createdBy,
      action: input.autoPost ? "JOURNAL_ENTRY_POSTED" : "JOURNAL_ENTRY_CREATED",
      entityType: "JournalEntry",
      entityId: entry.id,
      newValue: { entryNumber, status: entry.status, lines: input.lines },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return entry;
  };

  return existingTx ? run(existingTx) : db.transaction(run);
}

/** Posts a draft journal entry. Only posted entries affect financial statements. */
export async function postJournalEntry(
  journalEntryId: string,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string }
) {
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, journalEntryId))
      .limit(1);

    if (!entry) throw new NotFoundError("Journal entry");
    if (entry.status !== "DRAFT") {
      throw new ValidationError(`Only draft entries can be posted (current status: ${entry.status}).`);
    }

    await assertPeriodOpen(tx, entry.companyId, entry.entryDate);

    const lines = await tx
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, journalEntryId));

    validateLines(
      lines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit }))
    );

    const [updated] = await tx
      .update(journalEntries)
      .set({ status: "POSTED", postedBy: userId, postedAt: new Date(), updatedAt: new Date() })
      .where(eq(journalEntries.id, journalEntryId))
      .returning();

    await tx.insert(auditLogs).values({
      companyId: entry.companyId,
      userId,
      action: "JOURNAL_ENTRY_POSTED",
      entityType: "JournalEntry",
      entityId: journalEntryId,
      previousValue: { status: "DRAFT" },
      newValue: { status: "POSTED" },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return updated;
  });
}

/**
 * Reverses a posted journal entry by creating an equal-and-opposite entry
 * dated today (or a given date), preserving the immutable audit trail.
 * The original entry is marked REVERSED and linked to the reversal.
 */
export async function reverseJournalEntry(
  journalEntryId: string,
  userId: string,
  opts?: { reversalDate?: Date; reason?: string; ipAddress?: string; userAgent?: string }
) {
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, journalEntryId))
      .limit(1);

    if (!entry) throw new NotFoundError("Journal entry");
    if (entry.status !== "POSTED") {
      throw new ValidationError("Only posted entries can be reversed.");
    }

    const lines = await tx
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, journalEntryId));

    const reversalDate = opts?.reversalDate ?? new Date();
    await assertPeriodOpen(tx, entry.companyId, reversalDate);

    const periodId = await assertPeriodOpen(tx, entry.companyId, reversalDate);
    const entryNumber = await nextNumber(tx, entry.companyId, "REV");

    const [reversal] = await tx
      .insert(journalEntries)
      .values({
        companyId: entry.companyId,
        entryNumber,
        entryDate: reversalDate,
        transactionType: "REVERSAL",
        description: `Reversal of ${entry.entryNumber}: ${opts?.reason ?? entry.description}`,
        reference: entry.reference,
        status: "POSTED",
        periodId: periodId ?? undefined,
        reversalOfId: entry.id,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        createdBy: userId,
        postedBy: userId,
        postedAt: new Date(),
      })
      .returning();

    // Swap debit/credit for every line.
    await tx.insert(journalLines).values(
      lines.map((l, idx) => ({
        journalEntryId: reversal.id,
        companyId: entry.companyId,
        accountId: l.accountId,
        debit: l.credit,
        credit: l.debit,
        description: l.description,
        lineNumber: idx + 1,
        customerId: l.customerId,
        supplierId: l.supplierId,
        employeeId: l.employeeId,
        assetId: l.assetId,
        taxRateId: l.taxRateId,
      }))
    );

    await tx
      .update(journalEntries)
      .set({ status: "REVERSED", reversedById: reversal.id, updatedAt: new Date() })
      .where(eq(journalEntries.id, entry.id));

    await tx.insert(auditLogs).values({
      companyId: entry.companyId,
      userId,
      action: "JOURNAL_ENTRY_REVERSED",
      entityType: "JournalEntry",
      entityId: entry.id,
      previousValue: { status: "POSTED" },
      newValue: { status: "REVERSED", reversalEntryId: reversal.id, reason: opts?.reason },
      ipAddress: opts?.ipAddress,
      userAgent: opts?.userAgent,
    });

    return reversal;
  });
}

/**
 * Updates a DRAFT entry's header and lines in place. Only draft entries are
 * mutable — once posted, an entry is immutable and must be corrected via
 * reverseJournalEntry instead, so the audit trail never silently changes.
 */
export async function updateJournalEntry(
  journalEntryId: string,
  companyId: string,
  input: {
    entryDate: Date;
    description: string;
    reference?: string;
    lines: JournalLineInput[];
  },
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string }
) {
  validateLines(input.lines);

  return db.transaction(async (tx) => {
    const [entry] = await tx
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.id, journalEntryId), eq(journalEntries.companyId, companyId)))
      .limit(1);

    if (!entry) throw new NotFoundError("Journal entry");
    if (entry.status !== "DRAFT") {
      throw new ImmutableRecordError();
    }

    const previousLines = await tx
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, journalEntryId));

    const accountIds = [...new Set(input.lines.map((l) => l.accountId))];
    const accounts = await tx
      .select()
      .from(glAccounts)
      .where(eq(glAccounts.companyId, companyId));
    const accountMap = new Map(accounts.map((a) => [a.id, a]));
    for (const id of accountIds) {
      const acc = accountMap.get(id);
      if (!acc) {
        throw new ValidationError("One or more selected accounts do not belong to this company.");
      }
      if (!acc.isActive) {
        throw new ValidationError(`Account "${acc.name}" is inactive and cannot be used in new transactions.`);
      }
    }

    const periodId = await assertPeriodOpen(tx, companyId, input.entryDate);

    const [updated] = await tx
      .update(journalEntries)
      .set({
        entryDate: input.entryDate,
        description: input.description,
        reference: input.reference,
        periodId: periodId ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(journalEntries.id, journalEntryId))
      .returning();

    await tx.delete(journalLines).where(eq(journalLines.journalEntryId, journalEntryId));
    await tx.insert(journalLines).values(
      input.lines.map((line, idx) => ({
        journalEntryId,
        companyId,
        accountId: line.accountId,
        debit: fromCents(toCents(line.debit ?? 0)),
        credit: fromCents(toCents(line.credit ?? 0)),
        description: line.description,
        lineNumber: idx + 1,
        customerId: line.customerId ?? null,
        supplierId: line.supplierId ?? null,
        employeeId: line.employeeId ?? null,
        assetId: line.assetId ?? null,
        taxRateId: line.taxRateId ?? null,
      }))
    );

    await tx.insert(auditLogs).values({
      companyId,
      userId,
      action: "JOURNAL_ENTRY_UPDATED",
      entityType: "JournalEntry",
      entityId: journalEntryId,
      previousValue: { entryDate: entry.entryDate, description: entry.description, reference: entry.reference, lines: previousLines },
      newValue: { entryDate: input.entryDate, description: input.description, reference: input.reference, lines: input.lines },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return updated;
  });
}

/**
 * Permanently deletes a DRAFT entry. Safe because a draft never touched the
 * ledger — nothing posted, nothing to unwind. Anything POSTED/REVERSED/VOIDED
 * is refused here and must go through reverseJournalEntry instead, so the
 * audit trail for anything that ever affected the books is never erased.
 */
export async function deleteJournalEntry(
  journalEntryId: string,
  companyId: string,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string }
) {
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.id, journalEntryId), eq(journalEntries.companyId, companyId)))
      .limit(1);

    if (!entry) throw new NotFoundError("Journal entry");
    if (entry.status !== "DRAFT") {
      throw new ImmutableRecordError();
    }

    const lines = await tx
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, journalEntryId));

    await tx.delete(journalEntries).where(eq(journalEntries.id, journalEntryId));

    await tx.insert(auditLogs).values({
      companyId,
      userId,
      action: "JOURNAL_ENTRY_DELETED",
      entityType: "JournalEntry",
      entityId: journalEntryId,
      previousValue: { entryNumber: entry.entryNumber, description: entry.description, lines },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return { deleted: true };
  });
}

/** Voids a DRAFT entry (never a posted one — those must be reversed instead). */
export async function voidJournalEntry(
  journalEntryId: string,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string }
) {
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, journalEntryId))
      .limit(1);

    if (!entry) throw new NotFoundError("Journal entry");
    if (entry.status === "POSTED") {
      throw new ImmutableRecordError();
    }
    if (entry.status !== "DRAFT") {
      throw new ValidationError(`Entry is already ${entry.status.toLowerCase()}.`);
    }

    const [updated] = await tx
      .update(journalEntries)
      .set({ status: "VOIDED", updatedAt: new Date() })
      .where(eq(journalEntries.id, journalEntryId))
      .returning();

    await tx.insert(auditLogs).values({
      companyId: entry.companyId,
      userId,
      action: "JOURNAL_ENTRY_VOIDED",
      entityType: "JournalEntry",
      entityId: journalEntryId,
      previousValue: { status: "DRAFT" },
      newValue: { status: "VOIDED" },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return updated;
  });
}
