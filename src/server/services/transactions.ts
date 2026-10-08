import { createJournalEntry, type JournalLineInput } from "./accounting-engine";
import { getAccountByCode, getOrCreateAccountByCode } from "./chart-of-accounts";
import { toCents, fromCents } from "@/lib/money";
import { ValidationError } from "@/lib/errors";
import type { TransactionType } from "@/types/accounting";

interface BaseInput {
  companyId: string;
  date: Date;
  description: string;
  reference?: string;
  createdBy: string;
  autoPost?: boolean;
}

/** Splits a gross amount into base + tax given a tax rate (percent, e.g. 10 for 10%). */
export function splitTax(total: number, taxRatePercent: number) {
  if (taxRatePercent <= 0) return { base: total, tax: 0, total };
  const totalCents = toCents(total);
  const baseCents = Math.round(totalCents / (1 + taxRatePercent / 100));
  const taxCents = totalCents - baseCents;
  return { base: fromCents(baseCents), tax: fromCents(taxCents), total: fromCents(totalCents) };
}

/* ------------------------------------------------------------------ */
/*  REVENUE: Product/Service sale, Other income                        */
/* ------------------------------------------------------------------ */

export interface SaleInput extends BaseInput {
  amount: number;
  isCredit: boolean; // credit sale (to A/R) vs cash sale
  paymentAccountId?: string; // required if !isCredit (cash/bank account)
  revenueAccountId?: string; // defaults to Sales Revenue (4000)
  receivableAccountId?: string; // defaults to Accounts Receivable (1100)
  customerId?: string;
  taxRateId?: string;
  taxAccountId?: string;
  taxAmount?: number;
  transactionType?: Extract<TransactionType, "PRODUCT_SALE" | "SERVICE_REVENUE" | "OTHER_INCOME">;
}

export async function recordSale(input: SaleInput) {
  const revenueAccount = input.revenueAccountId
    ? { id: input.revenueAccountId }
    : await getAccountByCode(input.companyId, "4000");

  const debitAccountId = input.isCredit
    ? input.receivableAccountId ?? (await getAccountByCode(input.companyId, "1100")).id
    : input.paymentAccountId;

  if (!debitAccountId) {
    throw new ValidationError("A payment account is required for a cash sale.");
  }

  const lines: JournalLineInput[] = [
    {
      accountId: debitAccountId,
      debit: input.amount,
      customerId: input.customerId,
      description: input.description,
    },
    {
      accountId: revenueAccount.id,
      credit: input.taxAmount ? fromCents(toCents(input.amount) - toCents(input.taxAmount)) : input.amount,
      customerId: input.customerId,
      description: input.description,
    },
  ];

  if (input.taxAmount && input.taxAccountId) {
    lines.push({
      accountId: input.taxAccountId,
      credit: input.taxAmount,
      taxRateId: input.taxRateId,
      description: "Sales tax collected",
    });
  }

  return createJournalEntry({
    companyId: input.companyId,
    entryDate: input.date,
    transactionType: input.transactionType ?? "PRODUCT_SALE",
    description: input.description,
    reference: input.reference,
    lines,
    createdBy: input.createdBy,
    numberPrefix: "SALE",
    autoPost: input.autoPost ?? true,
  });
}

/* ------------------------------------------------------------------ */
/*  CUSTOMER PAYMENT (receipt against receivable)                       */
/* ------------------------------------------------------------------ */

export interface CustomerPaymentInput extends BaseInput {
  amount: number;
  paymentAccountId: string; // cash/bank
  receivableAccountId?: string;
  customerId: string;
}

export async function recordCustomerPayment(input: CustomerPaymentInput) {
  const receivableAccount = input.receivableAccountId
    ? { id: input.receivableAccountId }
    : await getAccountByCode(input.companyId, "1100");

  return createJournalEntry({
    companyId: input.companyId,
    entryDate: input.date,
    transactionType: "CUSTOMER_PAYMENT",
    description: input.description,
    reference: input.reference,
    lines: [
      { accountId: input.paymentAccountId, debit: input.amount, customerId: input.customerId },
      { accountId: receivableAccount.id, credit: input.amount, customerId: input.customerId },
    ],
    createdBy: input.createdBy,
    numberPrefix: "RCPT",
    autoPost: input.autoPost ?? true,
  });
}

/* ------------------------------------------------------------------ */
/*  EXPENSES (salary, rent, utilities, etc. — generic + specific)       */
/* ------------------------------------------------------------------ */

export interface ExpenseInput extends BaseInput {
  amount: number;
  expenseAccountId: string;
  paymentAccountId: string;
  isCredit?: boolean; // payable to supplier instead of immediate cash/bank
  payableAccountId?: string;
  supplierId?: string;
  employeeId?: string;
  taxAmount?: number;
  taxAccountId?: string;
  taxRateId?: string;
  transactionType: TransactionType;
}

export async function recordExpense(input: ExpenseInput) {
  const baseAmount = input.taxAmount
    ? fromCents(toCents(input.amount) - toCents(input.taxAmount))
    : input.amount;

  const creditAccountId = input.isCredit
    ? input.payableAccountId!
    : input.paymentAccountId;

  const lines: JournalLineInput[] = [
    {
      accountId: input.expenseAccountId,
      debit: baseAmount,
      supplierId: input.supplierId,
      employeeId: input.employeeId,
      description: input.description,
    },
  ];

  if (input.taxAmount && input.taxAccountId) {
    lines.push({
      accountId: input.taxAccountId,
      debit: input.taxAmount,
      taxRateId: input.taxRateId,
      description: "Input tax",
    });
  }

  lines.push({
    accountId: creditAccountId,
    credit: input.amount,
    supplierId: input.supplierId,
    employeeId: input.employeeId,
    description: input.description,
  });

  return createJournalEntry({
    companyId: input.companyId,
    entryDate: input.date,
    transactionType: input.transactionType,
    description: input.description,
    reference: input.reference,
    lines,
    createdBy: input.createdBy,
    numberPrefix: "EXP",
    autoPost: input.autoPost ?? true,
  });
}

/* ------------------------------------------------------------------ */
/*  SALARY                                                               */
/* ------------------------------------------------------------------ */

export interface SalaryInput extends BaseInput {
  employeeId: string;
  grossSalary: number;
  /** Employee-side Provident Fund contribution, withheld from gross pay. */
  providentFundEmployee?: number;
  /** Employer-side Provident Fund contribution — an additional cost to the company, not withheld from the employee. */
  providentFundEmployer?: number;
  /** Gratuity accrued for this pay period — an additional cost to the company, not withheld from the employee. */
  gratuityAccrual?: number;
  /** Income tax withheld from gross pay. */
  taxWithheld?: number;
  /** Any other amount withheld from gross pay (loan recovery, advance recovery, etc). */
  otherDeductions?: number;
  /** Net amount actually paid out. If omitted, computed as gross − employee-side deductions. */
  netAmount?: number;
  salaryExpenseAccountId?: string;
  paymentAccountId: string;
}

export async function recordSalaryPayment(input: SalaryInput) {
  const companyId = input.companyId;
  const pfEmployee = input.providentFundEmployee ?? 0;
  const pfEmployer = input.providentFundEmployer ?? 0;
  const gratuity = input.gratuityAccrual ?? 0;
  const tax = input.taxWithheld ?? 0;
  const other = input.otherDeductions ?? 0;

  const employeeSideDeductionsCents = toCents(pfEmployee) + toCents(tax) + toCents(other);
  const netCents = input.netAmount !== undefined ? toCents(input.netAmount) : toCents(input.grossSalary) - employeeSideDeductionsCents;
  if (netCents < 0) {
    throw new ValidationError("Net salary cannot be negative — deductions exceed gross salary.");
  }

  const expenseAccount = input.salaryExpenseAccountId
    ? { id: input.salaryExpenseAccountId }
    : await getAccountByCode(companyId, "6000");

  const lines: JournalLineInput[] = [
    {
      accountId: expenseAccount.id,
      debit: input.grossSalary,
      employeeId: input.employeeId,
      description: `Gross salary — ${input.description}`,
    },
  ];

  if (pfEmployer > 0) {
    const pfExpenseAccount = await getOrCreateAccountByCode(companyId, "6010");
    lines.push({
      accountId: pfExpenseAccount.id,
      debit: pfEmployer,
      employeeId: input.employeeId,
      description: "Employer Provident Fund contribution",
    });
  }

  if (gratuity > 0) {
    const gratuityExpenseAccount = await getOrCreateAccountByCode(companyId, "6020");
    lines.push({
      accountId: gratuityExpenseAccount.id,
      debit: gratuity,
      employeeId: input.employeeId,
      description: "Gratuity accrual",
    });
  }

  if (pfEmployee > 0 || pfEmployer > 0) {
    const pfPayableAccount = await getOrCreateAccountByCode(companyId, "2310");
    lines.push({
      accountId: pfPayableAccount.id,
      credit: fromCents(toCents(pfEmployee) + toCents(pfEmployer)),
      employeeId: input.employeeId,
      description: "Provident Fund payable (employee + employer contribution)",
    });
  }

  if (gratuity > 0) {
    const gratuityPayableAccount = await getOrCreateAccountByCode(companyId, "2320");
    lines.push({
      accountId: gratuityPayableAccount.id,
      credit: gratuity,
      employeeId: input.employeeId,
      description: "Gratuity payable",
    });
  }

  if (tax > 0) {
    const taxPayableAccount = await getAccountByCode(companyId, "2200");
    lines.push({
      accountId: taxPayableAccount.id,
      credit: tax,
      employeeId: input.employeeId,
      description: "Income tax withheld",
    });
  }

  if (other > 0) {
    const otherPayableAccount = await getOrCreateAccountByCode(companyId, "2330");
    lines.push({
      accountId: otherPayableAccount.id,
      credit: other,
      employeeId: input.employeeId,
      description: "Other payroll deductions payable",
    });
  }

  lines.push({
    accountId: input.paymentAccountId,
    credit: fromCents(netCents),
    employeeId: input.employeeId,
    description: "Net salary paid",
  });

  return createJournalEntry({
    companyId,
    entryDate: input.date,
    transactionType: "SALARY",
    description: input.description,
    reference: input.reference,
    lines,
    createdBy: input.createdBy,
    numberPrefix: "SAL",
    autoPost: input.autoPost ?? true,
  });
}

/* ------------------------------------------------------------------ */
/*  PURCHASES                                                            */
/* ------------------------------------------------------------------ */

export interface PurchaseInput extends BaseInput {
  amount: number;
  purchaseAccountId: string; // inventory / raw materials / office supplies / equipment
  isCredit: boolean;
  paymentAccountId?: string;
  payableAccountId?: string;
  supplierId?: string;
  taxAmount?: number;
  taxAccountId?: string;
  taxRateId?: string;
  transactionType: Extract<
    TransactionType,
    "RAW_MATERIAL_PURCHASE" | "INVENTORY_PURCHASE" | "OFFICE_SUPPLIES" | "EQUIPMENT_PURCHASE"
  >;
}

export async function recordPurchase(input: PurchaseInput) {
  const baseAmount = input.taxAmount
    ? fromCents(toCents(input.amount) - toCents(input.taxAmount))
    : input.amount;

  const creditAccountId = input.isCredit
    ? input.payableAccountId ?? (await getAccountByCode(input.companyId, "2000")).id
    : input.paymentAccountId;

  if (!creditAccountId) {
    throw new ValidationError("A payment or payable account is required.");
  }

  const lines: JournalLineInput[] = [
    { accountId: input.purchaseAccountId, debit: baseAmount, supplierId: input.supplierId },
  ];

  if (input.taxAmount && input.taxAccountId) {
    lines.push({ accountId: input.taxAccountId, debit: input.taxAmount, taxRateId: input.taxRateId });
  }

  lines.push({ accountId: creditAccountId, credit: input.amount, supplierId: input.supplierId });

  return createJournalEntry({
    companyId: input.companyId,
    entryDate: input.date,
    transactionType: input.transactionType,
    description: input.description,
    reference: input.reference,
    lines,
    createdBy: input.createdBy,
    numberPrefix: "PUR",
    autoPost: input.autoPost ?? true,
  });
}

/* ------------------------------------------------------------------ */
/*  SUPPLIER PAYMENT                                                     */
/* ------------------------------------------------------------------ */

export interface SupplierPaymentInput extends BaseInput {
  amount: number;
  paymentAccountId: string;
  payableAccountId?: string;
  supplierId: string;
}

export async function recordSupplierPayment(input: SupplierPaymentInput) {
  const payableAccount = input.payableAccountId
    ? { id: input.payableAccountId }
    : await getAccountByCode(input.companyId, "2000");

  return createJournalEntry({
    companyId: input.companyId,
    entryDate: input.date,
    transactionType: "SUPPLIER_PAYMENT",
    description: input.description,
    reference: input.reference,
    lines: [
      { accountId: payableAccount.id, debit: input.amount, supplierId: input.supplierId },
      { accountId: input.paymentAccountId, credit: input.amount, supplierId: input.supplierId },
    ],
    createdBy: input.createdBy,
    numberPrefix: "PAY",
    autoPost: input.autoPost ?? true,
  });
}

/* ------------------------------------------------------------------ */
/*  LOANS                                                                */
/* ------------------------------------------------------------------ */

export interface LoanReceivedInput extends BaseInput {
  amount: number;
  cashAccountId: string;
  loanAccountId?: string;
}
export async function recordLoanReceived(input: LoanReceivedInput) {
  const loanAccount = input.loanAccountId
    ? { id: input.loanAccountId }
    : await getAccountByCode(input.companyId, "2500");
  return createJournalEntry({
    companyId: input.companyId,
    entryDate: input.date,
    transactionType: "LOAN_RECEIVED",
    description: input.description,
    reference: input.reference,
    lines: [
      { accountId: input.cashAccountId, debit: input.amount },
      { accountId: loanAccount.id, credit: input.amount },
    ],
    createdBy: input.createdBy,
    numberPrefix: "LN",
    autoPost: input.autoPost ?? true,
  });
}

export interface LoanPaymentInput extends BaseInput {
  principalAmount: number;
  interestAmount?: number;
  interestExpenseAccountId?: string;
  cashAccountId: string;
  loanAccountId?: string;
}
export async function recordLoanPayment(input: LoanPaymentInput) {
  const loanAccount = input.loanAccountId
    ? { id: input.loanAccountId }
    : await getAccountByCode(input.companyId, "2500");

  const lines: JournalLineInput[] = [{ accountId: loanAccount.id, debit: input.principalAmount }];

  let totalCredit = toCents(input.principalAmount);

  if (input.interestAmount && input.interestAmount > 0) {
    const interestAccount = input.interestExpenseAccountId
      ? { id: input.interestExpenseAccountId }
      : await getAccountByCode(input.companyId, "6999");
    lines.push({ accountId: interestAccount.id, debit: input.interestAmount });
    totalCredit += toCents(input.interestAmount);
  }

  lines.push({ accountId: input.cashAccountId, credit: fromCents(totalCredit) });

  return createJournalEntry({
    companyId: input.companyId,
    entryDate: input.date,
    transactionType: "LOAN_PAYMENT",
    description: input.description,
    reference: input.reference,
    lines,
    createdBy: input.createdBy,
    numberPrefix: "LNP",
    autoPost: input.autoPost ?? true,
  });
}

/* ------------------------------------------------------------------ */
/*  EQUITY: Owner investment / drawings                                 */
/* ------------------------------------------------------------------ */

export interface OwnerInvestmentInput extends BaseInput {
  amount: number;
  cashAccountId: string;
  capitalAccountId?: string;
}
export async function recordOwnerInvestment(input: OwnerInvestmentInput) {
  const capitalAccount = input.capitalAccountId
    ? { id: input.capitalAccountId }
    : await getAccountByCode(input.companyId, "3000");
  return createJournalEntry({
    companyId: input.companyId,
    entryDate: input.date,
    transactionType: "OWNER_INVESTMENT",
    description: input.description,
    reference: input.reference,
    lines: [
      { accountId: input.cashAccountId, debit: input.amount },
      { accountId: capitalAccount.id, credit: input.amount },
    ],
    createdBy: input.createdBy,
    numberPrefix: "INV",
    autoPost: input.autoPost ?? true,
  });
}

export interface OwnerDrawingsInput extends BaseInput {
  amount: number;
  cashAccountId: string;
  drawingsAccountId?: string;
}
export async function recordOwnerDrawings(input: OwnerDrawingsInput) {
  const drawingsAccount = input.drawingsAccountId
    ? { id: input.drawingsAccountId }
    : await getAccountByCode(input.companyId, "3200");
  return createJournalEntry({
    companyId: input.companyId,
    entryDate: input.date,
    transactionType: "OWNER_DRAWINGS",
    description: input.description,
    reference: input.reference,
    lines: [
      { accountId: drawingsAccount.id, debit: input.amount },
      { accountId: input.cashAccountId, credit: input.amount },
    ],
    createdBy: input.createdBy,
    numberPrefix: "DRW",
    autoPost: input.autoPost ?? true,
  });
}

/* ------------------------------------------------------------------ */
/*  BANKING / CASH TRANSFERS                                            */
/* ------------------------------------------------------------------ */

export interface TransferInput extends BaseInput {
  amount: number;
  fromAccountId: string;
  toAccountId: string;
  transactionType?: Extract<
    TransactionType,
    "CASH_DEPOSIT" | "CASH_WITHDRAWAL" | "BANK_TRANSFER" | "CASH_TRANSFER"
  >;
}
export async function recordTransfer(input: TransferInput) {
  return createJournalEntry({
    companyId: input.companyId,
    entryDate: input.date,
    transactionType: input.transactionType ?? "BANK_TRANSFER",
    description: input.description,
    reference: input.reference,
    lines: [
      { accountId: input.toAccountId, debit: input.amount },
      { accountId: input.fromAccountId, credit: input.amount },
    ],
    createdBy: input.createdBy,
    numberPrefix: "TRF",
    autoPost: input.autoPost ?? true,
  });
}

/* ------------------------------------------------------------------ */
/*  TAX PAYMENT (settling a Tax Payable balance)                        */
/* ------------------------------------------------------------------ */

export interface TaxPaymentInput extends BaseInput {
  amount: number;
  taxPayableAccountId?: string;
  paymentAccountId: string;
}
export async function recordTaxPayment(input: TaxPaymentInput) {
  const taxPayable = input.taxPayableAccountId
    ? { id: input.taxPayableAccountId }
    : await getAccountByCode(input.companyId, "2200");
  return createJournalEntry({
    companyId: input.companyId,
    entryDate: input.date,
    transactionType: "TAX_PAYABLE",
    description: input.description,
    reference: input.reference,
    lines: [
      { accountId: taxPayable.id, debit: input.amount },
      { accountId: input.paymentAccountId, credit: input.amount },
    ],
    createdBy: input.createdBy,
    numberPrefix: "TAX",
    autoPost: input.autoPost ?? true,
  });
}

/* ------------------------------------------------------------------ */
/*  CUSTOM ENTRY / MANUAL JOURNAL                                       */
/* ------------------------------------------------------------------ */

export interface CustomEntryInput extends BaseInput {
  accountId: string; // the expense/revenue/other account
  paymentAccountId: string;
  amount: number;
  isDebitToAccount: boolean; // true = expense-like (debit account, credit payment); false = income-like
  taxAmount?: number;
  taxAccountId?: string;
  customerId?: string;
  supplierId?: string;
}
export async function recordCustomEntry(input: CustomEntryInput) {
  const baseAmount = input.taxAmount
    ? fromCents(toCents(input.amount) - toCents(input.taxAmount))
    : input.amount;

  const lines: JournalLineInput[] = [];
  if (input.isDebitToAccount) {
    lines.push({
      accountId: input.accountId,
      debit: baseAmount,
      customerId: input.customerId,
      supplierId: input.supplierId,
    });
    if (input.taxAmount && input.taxAccountId) {
      lines.push({ accountId: input.taxAccountId, debit: input.taxAmount });
    }
    lines.push({ accountId: input.paymentAccountId, credit: input.amount });
  } else {
    lines.push({ accountId: input.paymentAccountId, debit: input.amount });
    if (input.taxAmount && input.taxAccountId) {
      lines.push({ accountId: input.taxAccountId, credit: input.taxAmount });
    }
    lines.push({
      accountId: input.accountId,
      credit: baseAmount,
      customerId: input.customerId,
      supplierId: input.supplierId,
    });
  }

  return createJournalEntry({
    companyId: input.companyId,
    entryDate: input.date,
    transactionType: "CUSTOM_ENTRY",
    description: input.description,
    reference: input.reference,
    lines,
    createdBy: input.createdBy,
    numberPrefix: "CUS",
    autoPost: input.autoPost ?? true,
  });
}

export interface ManualJournalInput extends BaseInput {
  lines: JournalLineInput[];
}
export async function recordManualJournal(input: ManualJournalInput) {
  return createJournalEntry({
    companyId: input.companyId,
    entryDate: input.date,
    transactionType: "MANUAL_JOURNAL",
    description: input.description,
    reference: input.reference,
    lines: input.lines,
    createdBy: input.createdBy,
    numberPrefix: "JE",
    autoPost: input.autoPost ?? true,
  });
}

/* ------------------------------------------------------------------ */
/*  OPENING BALANCES                                                     */
/* ------------------------------------------------------------------ */

export interface OpeningBalanceInput extends BaseInput {
  lines: { accountId: string; amount: number; side: "DEBIT" | "CREDIT" }[];
}
export async function recordOpeningBalances(input: OpeningBalanceInput) {
  const lines: JournalLineInput[] = input.lines.map((l) => ({
    accountId: l.accountId,
    debit: l.side === "DEBIT" ? l.amount : 0,
    credit: l.side === "CREDIT" ? l.amount : 0,
  }));

  return createJournalEntry({
    companyId: input.companyId,
    entryDate: input.date,
    transactionType: "OPENING_BALANCE",
    description: input.description || "Opening balances",
    reference: input.reference,
    lines,
    createdBy: input.createdBy,
    numberPrefix: "OB",
    autoPost: input.autoPost ?? true,
  });
}
