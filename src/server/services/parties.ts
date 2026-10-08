import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { customers, suppliers, employees, journalLines, journalEntries, assets } from "@/server/db/schema";
import { NotFoundError } from "@/lib/errors";
import { toCents, fromCents } from "@/lib/money";
import { sql } from "drizzle-orm";

/* ---------------------------- Customers ---------------------------- */

export async function listCustomers(companyId: string) {
  return db.select().from(customers).where(eq(customers.companyId, companyId)).orderBy(customers.name);
}

export async function createCustomer(companyId: string, data: Omit<typeof customers.$inferInsert, "id" | "companyId">) {
  const [row] = await db.insert(customers).values({ ...data, companyId }).returning();
  return row;
}

export async function updateCustomer(companyId: string, id: string, data: Partial<typeof customers.$inferInsert>) {
  const [row] = await db
    .update(customers)
    .set(data)
    .where(and(eq(customers.id, id), eq(customers.companyId, companyId)))
    .returning();
  if (!row) throw new NotFoundError("Customer");
  return row;
}

/**
 * Deletes a customer, or deactivates them instead when they already have
 * transaction history — hard-deleting a party with posted journal activity
 * would orphan that history, so we fall back to a soft delete and say so.
 */
export async function deleteCustomer(companyId: string, id: string) {
  const [existing] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.companyId, companyId)));
  if (!existing) throw new NotFoundError("Customer");

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(journalLines)
    .where(and(eq(journalLines.companyId, companyId), eq(journalLines.customerId, id)));

  if (count > 0) {
    const [row] = await db
      .update(customers)
      .set({ isActive: false })
      .where(and(eq(customers.id, id), eq(customers.companyId, companyId)))
      .returning();
    return { deleted: false, deactivated: true, customer: row };
  }

  await db.delete(customers).where(and(eq(customers.id, id), eq(customers.companyId, companyId)));
  return { deleted: true, deactivated: false };
}

/** Outstanding receivable balance for a customer, derived from posted journal lines tagged to them. */
export async function getCustomerBalance(companyId: string, customerId: string) {
  const [row] = await db
    .select({
      debit: sql<string>`COALESCE(SUM(${journalLines.debit}), 0)`,
      credit: sql<string>`COALESCE(SUM(${journalLines.credit}), 0)`,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
    .where(
      and(
        eq(journalLines.companyId, companyId),
        eq(journalLines.customerId, customerId),
        eq(journalEntries.status, "POSTED")
      )
    );
  const balance = toCents(row?.debit ?? 0) - toCents(row?.credit ?? 0);
  return fromCents(balance);
}

export async function getCustomerLedger(companyId: string, customerId: string) {
  const rows = await db
    .select({
      date: journalEntries.entryDate,
      entryNumber: journalEntries.entryNumber,
      journalEntryId: journalEntries.id,
      description: journalEntries.description,
      transactionType: journalEntries.transactionType,
      debit: journalLines.debit,
      credit: journalLines.credit,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
    .where(
      and(
        eq(journalLines.companyId, companyId),
        eq(journalLines.customerId, customerId),
        eq(journalEntries.status, "POSTED")
      )
    )
    .orderBy(journalEntries.entryDate);
  return rows;
}

/* ---------------------------- Suppliers ---------------------------- */

export async function listSuppliers(companyId: string) {
  return db.select().from(suppliers).where(eq(suppliers.companyId, companyId)).orderBy(suppliers.name);
}

export async function createSupplier(companyId: string, data: Omit<typeof suppliers.$inferInsert, "id" | "companyId">) {
  const [row] = await db.insert(suppliers).values({ ...data, companyId }).returning();
  return row;
}

export async function updateSupplier(companyId: string, id: string, data: Partial<typeof suppliers.$inferInsert>) {
  const [row] = await db
    .update(suppliers)
    .set(data)
    .where(and(eq(suppliers.id, id), eq(suppliers.companyId, companyId)))
    .returning();
  if (!row) throw new NotFoundError("Supplier");
  return row;
}

/** Deletes a supplier, or deactivates them if they have transaction/asset history. */
export async function deleteSupplier(companyId: string, id: string) {
  const [existing] = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(and(eq(suppliers.id, id), eq(suppliers.companyId, companyId)));
  if (!existing) throw new NotFoundError("Supplier");

  const [{ count: lineCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(journalLines)
    .where(and(eq(journalLines.companyId, companyId), eq(journalLines.supplierId, id)));
  const [{ count: assetCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(assets)
    .where(and(eq(assets.companyId, companyId), eq(assets.supplierId, id)));

  if (lineCount > 0 || assetCount > 0) {
    const [row] = await db
      .update(suppliers)
      .set({ isActive: false })
      .where(and(eq(suppliers.id, id), eq(suppliers.companyId, companyId)))
      .returning();
    return { deleted: false, deactivated: true, supplier: row };
  }

  await db.delete(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.companyId, companyId)));
  return { deleted: true, deactivated: false };
}

export async function getSupplierBalance(companyId: string, supplierId: string) {
  const [row] = await db
    .select({
      debit: sql<string>`COALESCE(SUM(${journalLines.debit}), 0)`,
      credit: sql<string>`COALESCE(SUM(${journalLines.credit}), 0)`,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
    .where(
      and(
        eq(journalLines.companyId, companyId),
        eq(journalLines.supplierId, supplierId),
        eq(journalEntries.status, "POSTED")
      )
    );
  // Payable is a credit-normal balance
  const balance = toCents(row?.credit ?? 0) - toCents(row?.debit ?? 0);
  return fromCents(balance);
}

export async function getSupplierLedger(companyId: string, supplierId: string) {
  const rows = await db
    .select({
      date: journalEntries.entryDate,
      entryNumber: journalEntries.entryNumber,
      journalEntryId: journalEntries.id,
      description: journalEntries.description,
      transactionType: journalEntries.transactionType,
      debit: journalLines.debit,
      credit: journalLines.credit,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
    .where(
      and(
        eq(journalLines.companyId, companyId),
        eq(journalLines.supplierId, supplierId),
        eq(journalEntries.status, "POSTED")
      )
    )
    .orderBy(journalEntries.entryDate);
  return rows;
}

/* ---------------------------- Employees ---------------------------- */

export async function listEmployees(companyId: string) {
  return db.select().from(employees).where(eq(employees.companyId, companyId)).orderBy(employees.name);
}

export async function createEmployee(companyId: string, data: Omit<typeof employees.$inferInsert, "id" | "companyId">) {
  const [row] = await db.insert(employees).values({ ...data, companyId }).returning();
  return row;
}

export async function updateEmployee(companyId: string, id: string, data: Partial<typeof employees.$inferInsert>) {
  const [row] = await db
    .update(employees)
    .set(data)
    .where(and(eq(employees.id, id), eq(employees.companyId, companyId)))
    .returning();
  if (!row) throw new NotFoundError("Employee");
  return row;
}

/** Deletes an employee, or deactivates them if they have payroll/transaction history. */
export async function deleteEmployee(companyId: string, id: string) {
  const [existing] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(eq(employees.id, id), eq(employees.companyId, companyId)));
  if (!existing) throw new NotFoundError("Employee");

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(journalLines)
    .where(and(eq(journalLines.companyId, companyId), eq(journalLines.employeeId, id)));

  if (count > 0) {
    const [row] = await db
      .update(employees)
      .set({ isActive: false })
      .where(and(eq(employees.id, id), eq(employees.companyId, companyId)))
      .returning();
    return { deleted: false, deactivated: true, employee: row };
  }

  await db.delete(employees).where(and(eq(employees.id, id), eq(employees.companyId, companyId)));
  return { deleted: true, deactivated: false };
}
