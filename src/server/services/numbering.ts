import { sql } from "drizzle-orm";
import type { DbOrTx } from "@/server/db";
import { companies } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Company-aware, gap-free-per-prefix sequence generator.
 * Must be called inside the same DB transaction as the record creation
 * so the increment is atomic with the insert (row lock via FOR UPDATE).
 */
export async function nextNumber(
  tx: DbOrTx,
  companyId: string,
  prefix: string,
  pad = 6
): Promise<string> {
  const result = await tx.execute<{ next_sequence: Record<string, number> }>(
    sql`SELECT next_sequence FROM companies WHERE id = ${companyId} FOR UPDATE`
  );
  const row = (result as unknown as { rows: { next_sequence: Record<string, number> }[] }).rows[0];
  if (!row) throw new Error("Company not found");

  const current = (row.next_sequence?.[prefix] ?? 0) + 1;
  const updated = { ...(row.next_sequence ?? {}), [prefix]: current };

  await tx
    .update(companies)
    .set({ nextSequence: updated })
    .where(eq(companies.id, companyId));

  return `${prefix}-${String(current).padStart(pad, "0")}`;
}
