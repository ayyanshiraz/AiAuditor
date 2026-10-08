import { db, type DbOrTx } from "@/server/db";
import { glAccounts, journalLines, assets } from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { AccountType, NormalBalance } from "@/types/accounting";
import { NotFoundError, ValidationError } from "@/lib/errors";

interface DefaultAccount {
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  isCashOrBank?: boolean;
  subtype?: string;
}

/**
 * The standard default Chart of Accounts created for every new company.
 * Codes follow a conventional numeric block scheme:
 *   1000s Assets, 2000s Liabilities, 3000s Equity,
 *   4000s Revenue, 5000s COGS, 6000s Expenses
 */
export const DEFAULT_CHART_OF_ACCOUNTS: DefaultAccount[] = [
  // Assets
  { code: "1000", name: "Cash", type: "ASSET", normalBalance: "DEBIT", isCashOrBank: true, subtype: "Current Asset" },
  { code: "1010", name: "Bank Account", type: "ASSET", normalBalance: "DEBIT", isCashOrBank: true, subtype: "Current Asset" },
  { code: "1100", name: "Accounts Receivable", type: "ASSET", normalBalance: "DEBIT", subtype: "Current Asset" },
  { code: "1200", name: "Inventory", type: "ASSET", normalBalance: "DEBIT", subtype: "Current Asset" },
  { code: "1210", name: "Raw Materials", type: "ASSET", normalBalance: "DEBIT", subtype: "Current Asset" },
  { code: "1300", name: "Prepaid Expenses", type: "ASSET", normalBalance: "DEBIT", subtype: "Current Asset" },
  { code: "1500", name: "Fixed Assets", type: "ASSET", normalBalance: "DEBIT", subtype: "Non-Current Asset" },
  { code: "1590", name: "Accumulated Depreciation", type: "ASSET", normalBalance: "CREDIT", subtype: "Non-Current Asset" },
  { code: "1900", name: "Other Assets", type: "ASSET", normalBalance: "DEBIT", subtype: "Non-Current Asset" },

  // Liabilities
  { code: "2000", name: "Accounts Payable", type: "LIABILITY", normalBalance: "CREDIT", subtype: "Current Liability" },
  { code: "2100", name: "Accrued Expenses", type: "LIABILITY", normalBalance: "CREDIT", subtype: "Current Liability" },
  { code: "2200", name: "Tax Payable", type: "LIABILITY", normalBalance: "CREDIT", subtype: "Current Liability" },
  { code: "2300", name: "Salaries Payable", type: "LIABILITY", normalBalance: "CREDIT", subtype: "Current Liability" },
  { code: "2310", name: "Provident Fund Payable", type: "LIABILITY", normalBalance: "CREDIT", subtype: "Current Liability" },
  { code: "2320", name: "Gratuity Payable", type: "LIABILITY", normalBalance: "CREDIT", subtype: "Non-Current Liability" },
  { code: "2330", name: "Other Payroll Deductions Payable", type: "LIABILITY", normalBalance: "CREDIT", subtype: "Current Liability" },
  { code: "2500", name: "Loans Payable", type: "LIABILITY", normalBalance: "CREDIT", subtype: "Non-Current Liability" },
  { code: "2900", name: "Other Liabilities", type: "LIABILITY", normalBalance: "CREDIT", subtype: "Non-Current Liability" },

  // Equity
  { code: "3000", name: "Owner Capital", type: "EQUITY", normalBalance: "CREDIT" },
  { code: "3100", name: "Retained Earnings", type: "EQUITY", normalBalance: "CREDIT" },
  { code: "3200", name: "Drawings", type: "EQUITY", normalBalance: "DEBIT" },
  { code: "3300", name: "Current Year Earnings", type: "EQUITY", normalBalance: "CREDIT" },

  // Revenue
  { code: "4000", name: "Sales Revenue", type: "REVENUE", normalBalance: "CREDIT" },
  { code: "4100", name: "Service Revenue", type: "REVENUE", normalBalance: "CREDIT" },
  { code: "4900", name: "Other Revenue", type: "REVENUE", normalBalance: "CREDIT" },

  // COGS
  { code: "5000", name: "Cost of Goods Sold", type: "COGS", normalBalance: "DEBIT" },
  { code: "5100", name: "Raw Material Consumption", type: "COGS", normalBalance: "DEBIT" },

  // Expenses
  { code: "6000", name: "Salaries Expense", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "6010", name: "Employer Provident Fund Contribution", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "6020", name: "Gratuity Expense", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "6100", name: "Rent Expense", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "6200", name: "Utilities Expense", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "6210", name: "Internet Expense", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "6220", name: "Telephone Expense", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "6300", name: "Office Expense", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "6400", name: "Marketing Expense", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "6500", name: "Transportation Expense", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "6600", name: "Repairs & Maintenance", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "6700", name: "Insurance Expense", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "6800", name: "Professional Fees", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "6900", name: "Bank Charges", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "6950", name: "Tax Expense", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "6990", name: "Depreciation Expense", type: "EXPENSE", normalBalance: "DEBIT" },
  { code: "6999", name: "Other Expenses", type: "EXPENSE", normalBalance: "DEBIT" },
];

export async function createDefaultChartOfAccounts(tx: DbOrTx, companyId: string) {
  const rows = DEFAULT_CHART_OF_ACCOUNTS.map((a) => ({
    companyId,
    code: a.code,
    name: a.name,
    type: a.type,
    subtype: a.subtype,
    normalBalance: a.normalBalance,
    isCashOrBank: a.isCashOrBank ?? false,
    isSystem: true,
    isActive: true,
  }));
  await tx.insert(glAccounts).values(rows);
}

export async function getAccountByCode(companyId: string, code: string) {
  const [acc] = await db
    .select()
    .from(glAccounts)
    .where(and(eq(glAccounts.companyId, companyId), eq(glAccounts.code, code)))
    .limit(1);
  if (!acc) throw new NotFoundError(`Account ${code}`);
  return acc;
}

/**
 * Looks up a well-known account code, creating it from the default chart
 * definition if the company predates that code (e.g. a company created
 * before a new default account, such as Provident Fund Payable, was added
 * to DEFAULT_CHART_OF_ACCOUNTS). Self-healing rather than throwing keeps
 * older companies from breaking every time the standard chart grows.
 */
export async function getOrCreateAccountByCode(companyId: string, code: string, tx?: DbOrTx) {
  const client = tx ?? db;
  const [existing] = await client
    .select()
    .from(glAccounts)
    .where(and(eq(glAccounts.companyId, companyId), eq(glAccounts.code, code)))
    .limit(1);
  if (existing) return existing;

  const def = DEFAULT_CHART_OF_ACCOUNTS.find((d) => d.code === code);
  if (!def) throw new NotFoundError(`Account ${code}`);

  const [created] = await client
    .insert(glAccounts)
    .values({
      companyId,
      code: def.code,
      name: def.name,
      type: def.type,
      normalBalance: def.normalBalance,
      isCashOrBank: def.isCashOrBank ?? false,
      subtype: def.subtype,
    })
    .returning();
  return created;
}

export async function listAccounts(companyId: string, opts?: { activeOnly?: boolean }) {
  const rows = await db.select().from(glAccounts).where(eq(glAccounts.companyId, companyId));
  const filtered = opts?.activeOnly ? rows.filter((r) => r.isActive) : rows;
  return filtered.sort((a, b) => a.code.localeCompare(b.code));
}

export async function createAccount(
  companyId: string,
  data: { code: string; name: string; type: AccountType; normalBalance: NormalBalance; parentId?: string; description?: string; isCashOrBank?: boolean }
) {
  const existing = await db
    .select()
    .from(glAccounts)
    .where(and(eq(glAccounts.companyId, companyId), eq(glAccounts.code, data.code)));
  if (existing.length > 0) {
    throw new ValidationError(`Account code "${data.code}" already exists.`);
  }
  const [acc] = await db
    .insert(glAccounts)
    .values({
      companyId,
      code: data.code,
      name: data.name,
      type: data.type,
      normalBalance: data.normalBalance,
      parentId: data.parentId,
      description: data.description,
      isCashOrBank: data.isCashOrBank ?? false,
    })
    .returning();
  return acc;
}

export async function updateAccount(
  companyId: string,
  accountId: string,
  data: Partial<{ name: string; description: string; isActive: boolean; parentId: string | null; isCashOrBank: boolean }>
) {
  const [acc] = await db
    .select()
    .from(glAccounts)
    .where(and(eq(glAccounts.id, accountId), eq(glAccounts.companyId, companyId)));
  if (!acc) throw new NotFoundError("Account");

  const [updated] = await db
    .update(glAccounts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(glAccounts.id, accountId))
    .returning();
  return updated;
}

/**
 * Deletes a GL account, or deactivates it if it has posted activity or is a
 * system-created default account — hard-deleting a used account would break
 * every historical journal line and report that points at it.
 */
export async function deleteAccount(companyId: string, accountId: string) {
  const [acc] = await db
    .select()
    .from(glAccounts)
    .where(and(eq(glAccounts.id, accountId), eq(glAccounts.companyId, companyId)));
  if (!acc) throw new NotFoundError("Account");

  const [{ count: lineCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(journalLines)
    .where(and(eq(journalLines.companyId, companyId), eq(journalLines.accountId, accountId)));
  const [{ count: assetCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(assets)
    .where(
      and(
        eq(assets.companyId, companyId),
        sql`${assets.assetAccountId} = ${accountId} OR ${assets.accumulatedDeprAccountId} = ${accountId} OR ${assets.depreciationExpenseAccountId} = ${accountId}`
      )
    );

  if (acc.isSystem || lineCount > 0 || assetCount > 0) {
    if (!acc.isActive) {
      throw new ValidationError("This account is already inactive.");
    }
    const [row] = await db
      .update(glAccounts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(glAccounts.id, accountId), eq(glAccounts.companyId, companyId)))
      .returning();
    return { deleted: false, deactivated: true, account: row };
  }

  await db.delete(glAccounts).where(and(eq(glAccounts.id, accountId), eq(glAccounts.companyId, companyId)));
  return { deleted: true, deactivated: false };
}
