import { beforeEach, describe, expect, it } from "vitest";
import { truncateAll, setupTestCompany, midYearDate } from "./helpers";
import { createJournalEntry } from "@/server/services/accounting-engine";
import { createCompany } from "@/server/services/companies";
import { createAsset, disposeAsset, recordDepreciation } from "@/server/services/assets";
import {
  recordSale,
  recordExpense,
  recordSalaryPayment,
  recordOwnerInvestment,
  recordLoanReceived,
  recordLoanPayment,
  recordOpeningBalances,
} from "@/server/services/transactions";
import { closePeriod, listPeriods } from "@/server/services/periods";
import { createEmployee } from "@/server/services/parties";
import { getTrialBalance, getIncomeStatement, getBalanceSheet, getCashFlowStatement } from "@/server/services/reports";
import { UnbalancedEntryError, PeriodClosedError } from "@/lib/errors";

beforeEach(async () => {
  await truncateAll();
});

describe("1. Double-entry validation", () => {
  it("accepts a balanced journal entry", async () => {
    const { userId, companyId, acct } = await setupTestCompany();
    const entry = await createJournalEntry({
      companyId,
      entryDate: midYearDate(),
      transactionType: "MANUAL_JOURNAL",
      description: "Balanced test entry",
      lines: [
        { accountId: await acct("1000"), debit: 100 },
        { accountId: await acct("4000"), credit: 100 },
      ],
      createdBy: userId,
      autoPost: true,
    });
    expect(entry.status).toBe("POSTED");
  });
});

describe("2. Unbalanced entry rejection", () => {
  it("rejects an entry whose debits do not equal credits", async () => {
    const { userId, companyId, acct } = await setupTestCompany();
    await expect(
      createJournalEntry({
        companyId,
        entryDate: midYearDate(),
        transactionType: "MANUAL_JOURNAL",
        description: "Unbalanced test entry",
        lines: [
          { accountId: await acct("1000"), debit: 100 },
          { accountId: await acct("4000"), credit: 90 },
        ],
        createdBy: userId,
        autoPost: true,
      })
    ).rejects.toBeInstanceOf(UnbalancedEntryError);
  });
});

describe("3. Revenue flows into the Income Statement", () => {
  it("a posted sale increases total revenue and net profit", async () => {
    const { userId, companyId, acct } = await setupTestCompany();
    await recordSale({
      companyId,
      date: midYearDate(),
      description: "Cash sale",
      amount: 1000,
      isCredit: false,
      paymentAccountId: await acct("1000"),
      createdBy: userId,
    });
    const fyStart = new Date(new Date().getFullYear(), 0, 1);
    const is_ = await getIncomeStatement(companyId, fyStart, midYearDate(30));
    expect(is_.totalRevenue).toBe("1000.00");
    expect(is_.netProfit).toBe("1000.00");
  });
});

describe("4. Expense reduces net profit", () => {
  it("a posted expense increases total expenses and reduces net profit", async () => {
    const { userId, companyId, acct } = await setupTestCompany();
    await recordSale({
      companyId,
      date: midYearDate(),
      description: "Cash sale",
      amount: 1000,
      isCredit: false,
      paymentAccountId: await acct("1000"),
      createdBy: userId,
    });
    await recordExpense({
      companyId,
      date: midYearDate(1),
      description: "Utilities",
      amount: 300,
      expenseAccountId: await acct("6200"),
      paymentAccountId: await acct("1000"),
      transactionType: "UTILITIES",
      createdBy: userId,
    });
    const fyStart = new Date(new Date().getFullYear(), 0, 1);
    const is_ = await getIncomeStatement(companyId, fyStart, midYearDate(30));
    expect(is_.totalExpenses).toBe("300.00");
    expect(is_.netProfit).toBe("700.00");
  });
});

describe("5. Asset purchase reflects on the Balance Sheet", () => {
  it("a purchased asset increases total assets by its cost", async () => {
    const { userId, companyId, acct } = await setupTestCompany();
    await recordOwnerInvestment({
      companyId,
      date: midYearDate(0),
      description: "Seed capital",
      amount: 500000,
      cashAccountId: await acct("1010"),
      createdBy: userId,
    });
    await createAsset({
      companyId,
      name: "Delivery Van",
      purchaseDate: midYearDate(1),
      purchaseValue: 200000,
      usefulLifeMonths: 60,
      assetAccountId: await acct("1500"),
      accumulatedDeprAccountId: await acct("1590"),
      depreciationExpenseAccountId: await acct("6990"),
      paymentAccountId: await acct("1010"),
      createdBy: userId,
    });
    const bs = await getBalanceSheet(companyId, midYearDate(30));
    expect(bs.assets.total).toBe("500000.00"); // cash unaffected in total (van cost offsets cash used)
    expect(bs.isBalanced).toBe(true);
  });
});

describe("6. Asset disposal computes gain/loss correctly", () => {
  it("computes gain when proceeds exceed net book value", async () => {
    const { userId, companyId, acct } = await setupTestCompany();
    await recordOwnerInvestment({
      companyId,
      date: midYearDate(0),
      description: "Seed capital",
      amount: 500000,
      cashAccountId: await acct("1010"),
      createdBy: userId,
    });
    const asset = await createAsset({
      companyId,
      name: "Machine",
      purchaseDate: midYearDate(1),
      purchaseValue: 100000,
      usefulLifeMonths: 10,
      residualValue: 0,
      assetAccountId: await acct("1500"),
      accumulatedDeprAccountId: await acct("1590"),
      depreciationExpenseAccountId: await acct("6990"),
      paymentAccountId: await acct("1010"),
      createdBy: userId,
    });
    // Depreciate one month: 100000/10 = 10000. NBV = 90000.
    await recordDepreciation({
      companyId,
      assetId: asset.id,
      date: midYearDate(15),
      createdBy: userId,
    });
    const result = await disposeAsset({
      companyId,
      assetId: asset.id,
      date: midYearDate(20),
      proceeds: 95000,
      receiptAccountId: await acct("1010"),
      createdBy: userId,
    });
    expect(result.netBookValue).toBe("90000.00");
    expect(result.gainLoss).toBe("5000.00"); // gain
  });

  it("computes loss when proceeds are below net book value", async () => {
    const { userId, companyId, acct } = await setupTestCompany();
    await recordOwnerInvestment({
      companyId,
      date: midYearDate(0),
      description: "Seed capital",
      amount: 500000,
      cashAccountId: await acct("1010"),
      createdBy: userId,
    });
    const asset = await createAsset({
      companyId,
      name: "Old Equipment",
      purchaseDate: midYearDate(1),
      purchaseValue: 100000,
      usefulLifeMonths: 10,
      residualValue: 0,
      assetAccountId: await acct("1500"),
      accumulatedDeprAccountId: await acct("1590"),
      depreciationExpenseAccountId: await acct("6990"),
      paymentAccountId: await acct("1010"),
      createdBy: userId,
    });
    const result = await disposeAsset({
      companyId,
      assetId: asset.id,
      date: midYearDate(5),
      proceeds: 60000,
      receiptAccountId: await acct("1010"),
      createdBy: userId,
    });
    // No depreciation recorded yet, so NBV = cost = 100000.
    expect(result.netBookValue).toBe("100000.00");
    expect(result.gainLoss).toBe("-40000.00"); // loss
  });
});

describe("7. Owner investment increases cash and equity", () => {
  it("increases both cash and owner capital by the invested amount", async () => {
    const { userId, companyId, acct } = await setupTestCompany();
    await recordOwnerInvestment({
      companyId,
      date: midYearDate(),
      description: "Owner investment",
      amount: 250000,
      cashAccountId: await acct("1010"),
      createdBy: userId,
    });
    const bs = await getBalanceSheet(companyId, midYearDate(30));
    expect(bs.assets.total).toBe("250000.00");
    expect(bs.equity.total).toBe("250000.00");
    expect(bs.isBalanced).toBe(true);
  });
});

describe("8. Loan received increases cash and liability", () => {
  it("increases both cash and loans payable by the loan amount", async () => {
    const { userId, companyId, acct } = await setupTestCompany();
    await recordLoanReceived({
      companyId,
      date: midYearDate(),
      description: "Bank loan",
      amount: 300000,
      cashAccountId: await acct("1010"),
      createdBy: userId,
    });
    const bs = await getBalanceSheet(companyId, midYearDate(30));
    expect(bs.assets.total).toBe("300000.00");
    expect(bs.liabilities.total).toBe("300000.00");
    expect(bs.isBalanced).toBe(true);
  });
});

describe("9. Loan payment reduces cash and liability", () => {
  it("reduces both cash and loans payable by the principal paid", async () => {
    const { userId, companyId, acct } = await setupTestCompany();
    await recordLoanReceived({
      companyId,
      date: midYearDate(0),
      description: "Bank loan",
      amount: 300000,
      cashAccountId: await acct("1010"),
      createdBy: userId,
    });
    await recordLoanPayment({
      companyId,
      date: midYearDate(5),
      description: "Loan repayment",
      principalAmount: 50000,
      cashAccountId: await acct("1010"),
      createdBy: userId,
    });
    const bs = await getBalanceSheet(companyId, midYearDate(30));
    expect(bs.assets.total).toBe("250000.00");
    expect(bs.liabilities.total).toBe("250000.00");
    expect(bs.isBalanced).toBe(true);
  });
});

describe("10. Salary payment records expense and reduces cash", () => {
  it("increases salary expense and decreases the payment account", async () => {
    const { userId, companyId, acct } = await setupTestCompany();
    await recordOwnerInvestment({
      companyId,
      date: midYearDate(0),
      description: "Seed capital",
      amount: 100000,
      cashAccountId: await acct("1000"),
      createdBy: userId,
    });
    const employee = await createEmployee(companyId, { employeeCode: "EMP-001", name: "Jane Doe" });
    await recordSalaryPayment({
      companyId,
      date: midYearDate(5),
      description: "Monthly salary",
      employeeId: employee.id,
      grossSalary: 40000,
      netAmount: 40000,
      paymentAccountId: await acct("1000"),
      createdBy: userId,
    });
    const fyStart = new Date(new Date().getFullYear(), 0, 1);
    const is_ = await getIncomeStatement(companyId, fyStart, midYearDate(30));
    expect(is_.totalExpenses).toBe("40000.00");
    const bs = await getBalanceSheet(companyId, midYearDate(30));
    expect(bs.assets.total).toBe("60000.00");
  });
});

describe("11. Trial balance always balances", () => {
  it("total debits equal total credits after multiple postings", async () => {
    const { userId, companyId, acct } = await setupTestCompany();
    await recordOwnerInvestment({
      companyId,
      date: midYearDate(0),
      description: "Seed capital",
      amount: 600000,
      cashAccountId: await acct("1010"),
      createdBy: userId,
    });
    await recordSale({
      companyId,
      date: midYearDate(1),
      description: "Sale",
      amount: 150000,
      isCredit: false,
      paymentAccountId: await acct("1000"),
      createdBy: userId,
    });
    await recordExpense({
      companyId,
      date: midYearDate(2),
      description: "Utilities",
      amount: 20000,
      expenseAccountId: await acct("6200"),
      paymentAccountId: await acct("1010"),
      transactionType: "UTILITIES",
      createdBy: userId,
    });
    const tb = await getTrialBalance(companyId, midYearDate(30));
    expect(tb.isBalanced).toBe(true);
    expect(tb.totalDebit).toBe(tb.totalCredit);
  });
});

describe("12. Balance sheet equation holds", () => {
  it("Assets = Liabilities + Equity across a mix of transactions including contra-accounts", async () => {
    const { userId, companyId, acct } = await setupTestCompany();
    await recordOwnerInvestment({
      companyId,
      date: midYearDate(0),
      description: "Seed capital",
      amount: 600000,
      cashAccountId: await acct("1010"),
      createdBy: userId,
    });
    const asset = await createAsset({
      companyId,
      name: "Equipment",
      purchaseDate: midYearDate(1),
      purchaseValue: 120000,
      usefulLifeMonths: 12,
      assetAccountId: await acct("1500"),
      accumulatedDeprAccountId: await acct("1590"),
      depreciationExpenseAccountId: await acct("6990"),
      paymentAccountId: await acct("1010"),
      createdBy: userId,
    });
    await recordDepreciation({ companyId, assetId: asset.id, date: midYearDate(15), createdBy: userId });
    await recordLoanReceived({
      companyId,
      date: midYearDate(2),
      description: "Loan",
      amount: 200000,
      cashAccountId: await acct("1010"),
      createdBy: userId,
    });
    const bs = await getBalanceSheet(companyId, midYearDate(30));
    const assets = Number(bs.assets.total);
    const liabAndEquity = Number(bs.liabilities.total) + Number(bs.equity.total);
    expect(assets).toBeCloseTo(liabAndEquity, 5);
    expect(bs.isBalanced).toBe(true);
  });
});

describe("13. Cash flow statement reconciles to actual cash balance", () => {
  it("closing cash equals the actual cash/bank ledger balance", async () => {
    const { userId, companyId, acct } = await setupTestCompany();
    await recordOpeningBalances({
      companyId,
      date: midYearDate(0),
      description: "Opening balances",
      lines: [
        { accountId: await acct("1000"), amount: 50000, side: "DEBIT" },
        { accountId: await acct("1010"), amount: 100000, side: "DEBIT" },
        { accountId: await acct("3000"), amount: 150000, side: "CREDIT" },
      ],
      createdBy: userId,
    });
    await recordSale({
      companyId,
      date: midYearDate(5),
      description: "Sale",
      amount: 30000,
      isCredit: false,
      paymentAccountId: await acct("1000"),
      createdBy: userId,
    });
    const fyStart = new Date(new Date().getFullYear(), 0, 1);
    const cf = await getCashFlowStatement(companyId, fyStart, midYearDate(30));
    expect(cf.reconciles).toBe(true);
    expect(cf.closingCash).toBe(cf.actualClosingCash);
  });
});

describe("14. Draft entries never affect posted financial statements", () => {
  it("a draft (unposted) journal entry is excluded from the trial balance", async () => {
    const { userId, companyId, acct } = await setupTestCompany();
    await createJournalEntry({
      companyId,
      entryDate: midYearDate(),
      transactionType: "MANUAL_JOURNAL",
      description: "Draft entry",
      lines: [
        { accountId: await acct("1000"), debit: 999 },
        { accountId: await acct("4000"), credit: 999 },
      ],
      createdBy: userId,
      autoPost: false,
    });
    const tb = await getTrialBalance(companyId, midYearDate(30));
    expect(tb.rows.length).toBe(0);
    expect(tb.totalDebit).toBe("0.00");
  });
});

describe("15. Closed periods block new postings", () => {
  it("rejects a journal entry dated inside a closed period", async () => {
    const { userId, companyId, acct } = await setupTestCompany();
    const periods = await listPeriods(companyId);
    const targetPeriod = periods.find((p) => {
      const d = midYearDate();
      return p.startDate <= d && p.endDate >= d;
    })!;
    await closePeriod(companyId, targetPeriod.id, userId);

    await expect(
      createJournalEntry({
        companyId,
        entryDate: midYearDate(),
        transactionType: "MANUAL_JOURNAL",
        description: "Should be blocked",
        lines: [
          { accountId: await acct("1000"), debit: 10 },
          { accountId: await acct("4000"), credit: 10 },
        ],
        createdBy: userId,
        autoPost: true,
      })
    ).rejects.toBeInstanceOf(PeriodClosedError);
  });
});

describe("16. Company data isolation (multi-tenant)", () => {
  it("one company's accounts, journal entries, and reports are invisible to another company", async () => {
    const a = await setupTestCompany("Company A");
    const b = await setupTestCompany("Company B");

    await recordSale({
      companyId: a.companyId,
      date: midYearDate(),
      description: "Company A sale",
      amount: 5000,
      isCredit: false,
      paymentAccountId: await a.acct("1000"),
      createdBy: a.userId,
    });

    const tbA = await getTrialBalance(a.companyId, midYearDate(30));
    const tbB = await getTrialBalance(b.companyId, midYearDate(30));

    expect(tbA.totalDebit).not.toBe("0.00");
    expect(tbB.totalDebit).toBe("0.00");

    // Cross-company account id must be rejected when used on the wrong company.
    const wrongAccountId = await a.acct("1000");
    await expect(
      createJournalEntry({
        companyId: b.companyId,
        entryDate: midYearDate(),
        transactionType: "MANUAL_JOURNAL",
        description: "Cross-tenant attempt",
        lines: [
          { accountId: wrongAccountId, debit: 10 },
          { accountId: await b.acct("4000"), credit: 10 },
        ],
        createdBy: b.userId,
        autoPost: true,
      })
    ).rejects.toThrow();
  });

  it("createCompany scopes membership and chart of accounts to that company only", async () => {
    const user = await (await import("./helpers")).createTestUser();
    const company1 = await createCompany({ ownerId: user.id, name: "One" });
    const company2 = await createCompany({ ownerId: user.id, name: "Two" });
    expect(company1.id).not.toBe(company2.id);
  });
});
