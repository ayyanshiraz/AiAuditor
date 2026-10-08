import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { taxRates, journalLines } from "@/server/db/schema";
import { NotFoundError } from "@/lib/errors";

export async function listTaxRates(companyId: string) {
  return db.select().from(taxRates).where(eq(taxRates.companyId, companyId)).orderBy(taxRates.name);
}

export async function createTaxRate(
  companyId: string,
  data: {
    name: string;
    rate: number;
    taxType: string;
    taxAccountId: string;
    effectiveDate: Date;
  }
) {
  const [row] = await db
    .insert(taxRates)
    .values({ companyId, ...data, rate: data.rate.toString() })
    .returning();
  return row;
}

export async function updateTaxRate(
  companyId: string,
  id: string,
  data: Partial<{ name: string; rate: number; isActive: boolean }>
) {
  const { rate, ...rest } = data;
  const [row] = await db
    .update(taxRates)
    .set({ ...rest, ...(rate !== undefined ? { rate: rate.toString() } : {}) })
    .where(and(eq(taxRates.id, id), eq(taxRates.companyId, companyId)))
    .returning();
  if (!row) throw new NotFoundError("Tax rate");
  return row;
}

/** Deletes a tax rate, or deactivates it if it's been used on posted journal lines. */
export async function deleteTaxRate(companyId: string, id: string) {
  const [existing] = await db
    .select({ id: taxRates.id })
    .from(taxRates)
    .where(and(eq(taxRates.id, id), eq(taxRates.companyId, companyId)));
  if (!existing) throw new NotFoundError("Tax rate");

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(journalLines)
    .where(and(eq(journalLines.companyId, companyId), eq(journalLines.taxRateId, id)));

  if (count > 0) {
    const [row] = await db
      .update(taxRates)
      .set({ isActive: false })
      .where(and(eq(taxRates.id, id), eq(taxRates.companyId, companyId)))
      .returning();
    return { deleted: false, deactivated: true, taxRate: row };
  }

  await db.delete(taxRates).where(and(eq(taxRates.id, id), eq(taxRates.companyId, companyId)));
  return { deleted: true, deactivated: false };
}
