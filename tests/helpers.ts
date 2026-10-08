import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { createCompany } from "@/server/services/companies";
import { getAccountByCode } from "@/server/services/chart-of-accounts";
import { generateMonthlyPeriods } from "@/server/services/periods";

/**
 * Wipes every table between tests so each test starts from a clean slate.
 * TRUNCATE ... CASCADE handles FK ordering for us; RESTART IDENTITY isn't
 * needed since every PK here is a UUID, not a serial.
 */
export async function truncateAll() {
  const tableNames = [
    "audit_logs",
    "notifications",
    "attachments",
    "journal_lines",
    "journal_entries",
    "tax_rates",
    "assets",
    "employees",
    "suppliers",
    "customers",
    "gl_accounts",
    "accounting_periods",
    "company_members",
    "companies",
    "password_reset_tokens",
    "auth_verification_tokens",
    "auth_sessions",
    "auth_accounts",
    "users",
  ];
  await db.execute(sql.raw(`TRUNCATE TABLE ${tableNames.map((t) => `"${t}"`).join(", ")} CASCADE`));
}

let userCounter = 0;

export async function createTestUser(name = "Test User") {
  userCounter += 1;
  const [user] = await db
    .insert(users)
    .values({ name, email: `test-user-${userCounter}-${Date.now()}@example.com` })
    .returning();
  return user;
}

/**
 * Sets up a fresh company (with its default chart of accounts and 12 open
 * monthly periods for the current fiscal year) owned by a fresh user, and
 * returns everything a test typically needs: the user id, company id, and
 * a lookup helper for account ids by their chart-of-accounts code.
 */
export async function setupTestCompany(name = "Test Co") {
  const user = await createTestUser();
  const company = await createCompany({ ownerId: user.id, name });
  const fyStart = new Date(new Date().getFullYear(), 0, 1);
  await generateMonthlyPeriods(company.id, fyStart);

  const accountCache = new Map<string, string>();
  const acct = async (code: string) => {
    if (accountCache.has(code)) return accountCache.get(code)!;
    const account = await getAccountByCode(company.id, code);
    accountCache.set(code, account.id);
    return account.id;
  };

  return { userId: user.id, companyId: company.id, acct };
}

/** A date safely inside the current fiscal year's open periods. */
export function midYearDate(dayOffset = 15) {
  const d = new Date(new Date().getFullYear(), 0, 1);
  d.setDate(d.getDate() + dayOffset);
  return d;
}
