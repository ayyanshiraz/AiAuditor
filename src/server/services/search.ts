import { and, eq, ilike, or, desc } from "drizzle-orm";
import { db } from "@/server/db";
import {
  glAccounts,
  customers,
  suppliers,
  employees,
  assets,
  journalEntries,
} from "@/server/db/schema";

export interface SearchResult {
  category: "Account" | "Customer" | "Supplier" | "Employee" | "Asset" | "Journal Entry";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

const RESULTS_PER_CATEGORY = 5;

/**
 * Company-scoped global search across accounts, customers, suppliers,
 * employees, assets and journal entries. Never crosses company boundaries —
 * every query below is filtered by companyId, same as every other read in
 * the app.
 */
export async function globalSearch(companyId: string, query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const like = `%${q}%`;

  const [accountRows, customerRows, supplierRows, employeeRows, assetRows, journalRows] =
    await Promise.all([
      db
        .select()
        .from(glAccounts)
        .where(and(eq(glAccounts.companyId, companyId), or(ilike(glAccounts.name, like), ilike(glAccounts.code, like))))
        .limit(RESULTS_PER_CATEGORY),
      db
        .select()
        .from(customers)
        .where(and(eq(customers.companyId, companyId), or(ilike(customers.name, like), ilike(customers.email, like))))
        .limit(RESULTS_PER_CATEGORY),
      db
        .select()
        .from(suppliers)
        .where(and(eq(suppliers.companyId, companyId), or(ilike(suppliers.name, like), ilike(suppliers.email, like))))
        .limit(RESULTS_PER_CATEGORY),
      db
        .select()
        .from(employees)
        .where(
          and(
            eq(employees.companyId, companyId),
            or(ilike(employees.name, like), ilike(employees.employeeCode, like))
          )
        )
        .limit(RESULTS_PER_CATEGORY),
      db
        .select()
        .from(assets)
        .where(and(eq(assets.companyId, companyId), or(ilike(assets.name, like), ilike(assets.assetCode, like))))
        .limit(RESULTS_PER_CATEGORY),
      db
        .select()
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.companyId, companyId),
            or(
              ilike(journalEntries.entryNumber, like),
              ilike(journalEntries.description, like),
              ilike(journalEntries.reference, like)
            )
          )
        )
        .orderBy(desc(journalEntries.entryDate))
        .limit(RESULTS_PER_CATEGORY),
    ]);

  const results: SearchResult[] = [
    ...accountRows.map((a) => ({
      category: "Account" as const,
      id: a.id,
      title: `${a.code} · ${a.name}`,
      subtitle: a.type,
      href: `/companies/${companyId}/accounts/${a.id}`,
    })),
    ...customerRows.map((c) => ({
      category: "Customer" as const,
      id: c.id,
      title: c.name,
      subtitle: c.email ?? "Customer",
      href: `/companies/${companyId}/customers/${c.id}`,
    })),
    ...supplierRows.map((s) => ({
      category: "Supplier" as const,
      id: s.id,
      title: s.name,
      subtitle: s.email ?? "Supplier",
      href: `/companies/${companyId}/suppliers/${s.id}`,
    })),
    ...employeeRows.map((e) => ({
      category: "Employee" as const,
      id: e.id,
      title: e.name,
      subtitle: e.position ?? e.employeeCode,
      href: `/companies/${companyId}/employees`,
    })),
    ...assetRows.map((a) => ({
      category: "Asset" as const,
      id: a.id,
      title: `${a.assetCode} · ${a.name}`,
      subtitle: a.category ?? "Asset",
      href: `/companies/${companyId}/assets`,
    })),
    ...journalRows.map((j) => ({
      category: "Journal Entry" as const,
      id: j.id,
      title: `${j.entryNumber} — ${j.description}`,
      subtitle: `${j.status} · ${j.entryDate.toISOString().slice(0, 10)}`,
      href: `/companies/${companyId}/journal/${j.id}`,
    })),
  ];

  return results;
}
