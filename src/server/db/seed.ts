/**
 * Seed script: creates a demo user and "ABC Manufacturing Ltd." company,
 * then runs the full acceptance-test transaction sequence described in the
 * project brief so the seeded books demonstrate a working double-entry
 * system end-to-end (journal, ledger, trial balance, income statement,
 * balance sheet, cash flow, assets, customers, suppliers, taxes).
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users, glAccounts } from "./schema";
import { hashPassword } from "@/server/auth/password";
import { createCompany } from "@/server/services/companies";
import { getAccountByCode } from "@/server/services/chart-of-accounts";
import { generateMonthlyPeriods } from "@/server/services/periods";
import { createCustomer, createSupplier, createEmployee } from "@/server/services/parties";
import { createTaxRate } from "@/server/services/taxes";
import { createAsset, disposeAsset } from "@/server/services/assets";
import {
  recordOpeningBalances,
  recordPurchase,
  recordExpense,
  recordSalaryPayment,
  recordSale,
  recordLoanReceived,
  recordOwnerDrawings,
  recordCustomerPayment,
  recordSupplierPayment,
  recordTaxPayment,
} from "@/server/services/transactions";

async function main() {
  console.log("Seeding database...");

  const email = "demo@ledgerly.dev";
  const passwordHash = await hashPassword("Password123!");

  let [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    [user] = await db.insert(users).values({ name: "Demo Owner", email, passwordHash }).returning();
  }
  console.log(`User ready: ${email} / Password123!`);

  const company = await createCompany({
    ownerId: user.id,
    name: "ABC Manufacturing Ltd.",
    legalName: "ABC Manufacturing (Private) Limited",
    businessType: "Manufacturing",
    registrationNumber: "REG-2024-00123",
    taxNumber: "NTN-1234567-8",
    address: "Plot 45, Industrial Area",
    country: "Pakistan",
    city: "Lahore",
    phone: "+92 300 1234567",
    email: "info@abcmanufacturing.example",
    baseCurrency: "PKR",
    fiscalYearStartMonth: 1,
    fiscalYearStartDay: 1,
  });
  console.log(`Company created: ${company.name} (${company.id})`);

  await generateMonthlyPeriods(company.id, new Date(new Date().getFullYear(), 0, 1));
  console.log("Accounting periods generated for the current financial year.");

  const [cash, bank, ar, inventory, rawMaterials, fixedAssets, accumDepr, deprExpense, ap, taxPayable, loans, ownerCapital, drawings, salesRevenue, salesTax] =
    await Promise.all([
      getAccountByCode(company.id, "1000"),
      getAccountByCode(company.id, "1010"),
      getAccountByCode(company.id, "1100"),
      getAccountByCode(company.id, "1200"),
      getAccountByCode(company.id, "1210"),
      getAccountByCode(company.id, "1500"),
      getAccountByCode(company.id, "1590"),
      getAccountByCode(company.id, "6990"),
      getAccountByCode(company.id, "2000"),
      getAccountByCode(company.id, "2200"),
      getAccountByCode(company.id, "2500"),
      getAccountByCode(company.id, "3000"),
      getAccountByCode(company.id, "3200"),
      getAccountByCode(company.id, "4000"),
      getAccountByCode(company.id, "2200"),
    ]);

  // Mark cash & bank as cash/bank accounts for cash-flow classification.
  await db.update(glAccounts).set({ isCashOrBank: true }).where(eq(glAccounts.id, cash.id));
  await db.update(glAccounts).set({ isCashOrBank: true }).where(eq(glAccounts.id, bank.id));

  const jan1 = new Date(new Date().getFullYear(), 0, 1);

  // 1. Opening balances: Cash 100,000 / Bank 500,000 / Owner Capital 600,000
  await recordOpeningBalances({
    companyId: company.id,
    date: jan1,
    description: "Opening balances",
    createdBy: user.id,
    lines: [
      { accountId: cash.id, amount: 100000, side: "DEBIT" },
      { accountId: bank.id, amount: 500000, side: "DEBIT" },
      { accountId: ownerCapital.id, amount: 600000, side: "CREDIT" },
    ],
  });
  console.log("1. Opening balances posted.");

  const customer = await createCustomer(company.id, {
    name: "Al-Falah Traders",
    company: "Al-Falah Traders",
    email: "accounts@alfalah-traders.example",
    phone: "+92 321 1112233",
    openingBalance: "0",
  } as never);

  const supplier = await createSupplier(company.id, {
    name: "Punjab Steel Suppliers",
    company: "Punjab Steel Suppliers",
    email: "sales@punjabsteel.example",
    phone: "+92 42 1234567",
    openingBalance: "0",
  } as never);

  const employee = await createEmployee(company.id, {
    employeeCode: "EMP-0001",
    name: "Bilal Ahmed",
    department: "Production",
    position: "Floor Supervisor",
    salary: "50000",
    joiningDate: jan1,
  } as never);

  const salesTaxRate = await createTaxRate(company.id, {
    name: "Sales Tax",
    rate: 17,
    taxType: "Sales Tax",
    taxAccountId: taxPayable.id,
    effectiveDate: jan1,
  });

  const day = (n: number) => new Date(jan1.getFullYear(), 0, 1 + n);

  // 2. Raw material purchased for 100,000 by bank.
  await recordPurchase({
    companyId: company.id,
    date: day(2),
    description: "Raw material purchase — Punjab Steel Suppliers",
    createdBy: user.id,
    amount: 100000,
    purchaseAccountId: rawMaterials.id,
    isCredit: false,
    paymentAccountId: bank.id,
    supplierId: supplier.id,
    transactionType: "RAW_MATERIAL_PURCHASE",
  });
  console.log("2. Raw material purchase posted.");

  // 3. Utilities bill paid for 20,000.
  const utilities = await getAccountByCode(company.id, "6200");
  await recordExpense({
    companyId: company.id,
    date: day(4),
    description: "Utilities bill",
    createdBy: user.id,
    amount: 20000,
    expenseAccountId: utilities.id,
    paymentAccountId: bank.id,
    transactionType: "UTILITIES",
  });
  console.log("3. Utilities expense posted.");

  // 4. Salary paid for 50,000.
  await recordSalaryPayment({
    companyId: company.id,
    date: day(5),
    description: "Monthly salary — Bilal Ahmed",
    createdBy: user.id,
    employeeId: employee.id,
    grossSalary: 50000,
    netAmount: 50000,
    paymentAccountId: bank.id,
  });
  console.log("4. Salary payment posted.");

  // 5. Product sold for 300,000 cash.
  await recordSale({
    companyId: company.id,
    date: day(6),
    description: "Cash sale of finished goods",
    createdBy: user.id,
    amount: 300000,
    isCredit: false,
    paymentAccountId: cash.id,
    transactionType: "PRODUCT_SALE",
  });
  console.log("5. Cash sale posted.");

  // 6. Equipment purchased for 200,000 from bank.
  const equipment = await createAsset({
    companyId: company.id,
    name: "CNC Milling Machine",
    category: "Machinery",
    purchaseDate: day(7),
    purchaseValue: 200000,
    usefulLifeMonths: 60,
    residualValue: 20000,
    assetAccountId: fixedAssets.id,
    accumulatedDeprAccountId: accumDepr.id,
    depreciationExpenseAccountId: deprExpense.id,
    paymentAccountId: bank.id,
    createdBy: user.id,
  });
  console.log("6. Equipment purchase (asset) posted.");

  // 7. Tax expense/payable recorded appropriately.
  const taxExpense = await getAccountByCode(company.id, "6950");
  await recordExpense({
    companyId: company.id,
    date: day(8),
    description: "Provision for income tax",
    createdBy: user.id,
    amount: 15000,
    expenseAccountId: taxExpense.id,
    paymentAccountId: bank.id,
    isCredit: true,
    payableAccountId: taxPayable.id,
    transactionType: "TAX_EXPENSE",
  });
  console.log("7. Tax expense/payable posted.");

  // 8. Loan received for 500,000.
  await recordLoanReceived({
    companyId: company.id,
    date: day(9),
    description: "Bank term loan received",
    createdBy: user.id,
    amount: 500000,
    cashAccountId: bank.id,
    loanAccountId: loans.id,
  });
  console.log("8. Loan received posted.");

  // 9. Owner withdrawal of 30,000.
  await recordOwnerDrawings({
    companyId: company.id,
    date: day(10),
    description: "Owner drawings",
    createdBy: user.id,
    amount: 30000,
    cashAccountId: cash.id,
    drawingsAccountId: drawings.id,
  });
  console.log("9. Owner drawings posted.");

  // 10. Asset depreciation recorded.
  const { recordDepreciation } = await import("@/server/services/assets");
  await recordDepreciation({
    companyId: company.id,
    assetId: equipment.id,
    date: day(11),
    createdBy: user.id,
  });
  console.log("10. Asset depreciation posted.");

  // 11. One customer credit sale.
  await recordSale({
    companyId: company.id,
    date: day(12),
    description: "Credit sale — Al-Falah Traders",
    createdBy: user.id,
    amount: 150000,
    isCredit: true,
    customerId: customer.id,
    receivableAccountId: ar.id,
    transactionType: "PRODUCT_SALE",
    taxRateId: salesTaxRate.id,
    taxAccountId: salesTax.id,
    taxAmount: (150000 * 17) / 117,
  });
  console.log("11. Customer credit sale posted.");

  // 12. Customer payment received.
  await recordCustomerPayment({
    companyId: company.id,
    date: day(20),
    description: "Payment received — Al-Falah Traders",
    createdBy: user.id,
    amount: 90000,
    paymentAccountId: bank.id,
    receivableAccountId: ar.id,
    customerId: customer.id,
  });
  console.log("12. Customer payment posted.");

  // 13. One supplier credit purchase.
  await recordPurchase({
    companyId: company.id,
    date: day(13),
    description: "Credit purchase — Punjab Steel Suppliers",
    createdBy: user.id,
    amount: 80000,
    purchaseAccountId: rawMaterials.id,
    isCredit: true,
    payableAccountId: ap.id,
    supplierId: supplier.id,
    transactionType: "RAW_MATERIAL_PURCHASE",
  });
  console.log("13. Supplier credit purchase posted.");

  // 14. Supplier payment made.
  await recordSupplierPayment({
    companyId: company.id,
    date: day(22),
    description: "Payment made — Punjab Steel Suppliers",
    createdBy: user.id,
    amount: 50000,
    paymentAccountId: bank.id,
    payableAccountId: ap.id,
    supplierId: supplier.id,
  });
  console.log("14. Supplier payment posted.");

  // 15. Asset sold (a second, smaller asset bought then sold to show disposal gain/loss).
  const smallAsset = await createAsset({
    companyId: company.id,
    name: "Office Furniture Set",
    category: "Furniture",
    purchaseDate: day(1),
    purchaseValue: 40000,
    usefulLifeMonths: 36,
    residualValue: 4000,
    assetAccountId: fixedAssets.id,
    accumulatedDeprAccountId: accumDepr.id,
    depreciationExpenseAccountId: deprExpense.id,
    paymentAccountId: cash.id,
    createdBy: user.id,
  });
  await disposeAsset({
    companyId: company.id,
    assetId: smallAsset.id,
    date: day(25),
    proceeds: 38000,
    receiptAccountId: cash.id,
    gainAccountId: (await getAccountByCode(company.id, "4900")).id,
    lossAccountId: (await getAccountByCode(company.id, "6999")).id,
    createdBy: user.id,
  });
  console.log("15. Asset purchase + disposal (gain/loss) posted.");

  // Settle part of the tax payable to demonstrate tax payment flow.
  await recordTaxPayment({
    companyId: company.id,
    date: day(27),
    description: "Tax payment",
    createdBy: user.id,
    amount: 10000,
    taxPayableAccountId: taxPayable.id,
    paymentAccountId: bank.id,
  });
  console.log("16. Tax payment posted.");

  console.log("\nSeed complete.");
  console.log(`Login with: ${email} / Password123!`);
  console.log(`Company ID: ${company.id}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
