export interface Template {
  id: string;
  label: string;
  category: string;
  kind: string;
  transactionType?: string;
  defaultAccountCode?: string; // expense/purchase account default
  isCredit?: boolean; // whether this template defaults to credit/payable
}

export const TEMPLATES: Template[] = [
  // Revenue
  { id: "product-sale", label: "Product Sale", category: "Income / Revenue", kind: "sale", transactionType: "PRODUCT_SALE" },
  { id: "service-revenue", label: "Service Revenue", category: "Income / Revenue", kind: "sale", transactionType: "SERVICE_REVENUE" },
  { id: "other-income", label: "Other Income", category: "Income / Revenue", kind: "sale", transactionType: "OTHER_INCOME" },
  { id: "customer-payment", label: "Customer Payment", category: "Income / Revenue", kind: "customerPayment" },

  // Expenses
  { id: "salary", label: "Salary", category: "Expenses", kind: "salary" },
  { id: "rent", label: "Rent", category: "Expenses", kind: "expense", transactionType: "RENT", defaultAccountCode: "6100" },
  { id: "utilities", label: "Utilities", category: "Expenses", kind: "expense", transactionType: "UTILITIES", defaultAccountCode: "6200" },
  { id: "internet", label: "Internet", category: "Expenses", kind: "expense", transactionType: "UTILITIES", defaultAccountCode: "6210" },
  { id: "telephone", label: "Telephone", category: "Expenses", kind: "expense", transactionType: "UTILITIES", defaultAccountCode: "6220" },
  { id: "office-expense", label: "Office Expense", category: "Expenses", kind: "expense", transactionType: "OFFICE_EXPENSE", defaultAccountCode: "6300" },
  { id: "marketing", label: "Marketing", category: "Expenses", kind: "expense", transactionType: "MARKETING", defaultAccountCode: "6400" },
  { id: "transportation", label: "Transportation", category: "Expenses", kind: "expense", transactionType: "TRANSPORTATION", defaultAccountCode: "6500" },
  { id: "repairs", label: "Repairs", category: "Expenses", kind: "expense", transactionType: "REPAIRS", defaultAccountCode: "6600" },
  { id: "professional-fees", label: "Professional Fees", category: "Expenses", kind: "expense", transactionType: "PROFESSIONAL_FEES", defaultAccountCode: "6800" },
  { id: "insurance", label: "Insurance", category: "Expenses", kind: "expense", transactionType: "INSURANCE", defaultAccountCode: "6700" },
  { id: "bank-charges", label: "Bank Charges", category: "Expenses", kind: "expense", transactionType: "BANK_CHARGES", defaultAccountCode: "6900" },
  { id: "tax-expense", label: "Tax Expense", category: "Expenses", kind: "expense", transactionType: "TAX_EXPENSE", defaultAccountCode: "6950" },
  { id: "other-expense", label: "Other Expense", category: "Expenses", kind: "expense", transactionType: "OTHER_EXPENSE", defaultAccountCode: "6999" },

  // Purchases
  { id: "raw-material", label: "Raw Material Purchase", category: "Purchases", kind: "purchase", transactionType: "RAW_MATERIAL_PURCHASE", defaultAccountCode: "1210" },
  { id: "inventory-purchase", label: "Inventory Purchase", category: "Purchases", kind: "purchase", transactionType: "INVENTORY_PURCHASE", defaultAccountCode: "1200" },
  { id: "office-supplies", label: "Office Supplies", category: "Purchases", kind: "purchase", transactionType: "OFFICE_SUPPLIES", defaultAccountCode: "6300" },
  { id: "equipment-purchase", label: "Equipment Purchase", category: "Purchases", kind: "purchase", transactionType: "EQUIPMENT_PURCHASE", defaultAccountCode: "1500" },

  // Liabilities
  { id: "loan-received", label: "Loan Received", category: "Liabilities", kind: "loanReceived" },
  { id: "loan-payment", label: "Loan Payment", category: "Liabilities", kind: "loanPayment" },
  { id: "supplier-payment", label: "Supplier Payment", category: "Liabilities", kind: "supplierPayment" },
  { id: "tax-payable", label: "Tax Payment", category: "Liabilities", kind: "taxPayment" },

  // Equity
  { id: "owner-investment", label: "Owner Investment", category: "Equity", kind: "ownerInvestment" },
  { id: "capital-contribution", label: "Capital Contribution", category: "Equity", kind: "ownerInvestment" },
  { id: "owner-drawings", label: "Owner Drawings", category: "Equity", kind: "ownerDrawings" },
  { id: "dividend", label: "Dividend / Distribution", category: "Equity", kind: "ownerDrawings" },

  // Banking / Cash
  { id: "cash-deposit", label: "Cash Deposit", category: "Banking / Cash", kind: "transfer", transactionType: "CASH_DEPOSIT" },
  { id: "cash-withdrawal", label: "Cash Withdrawal", category: "Banking / Cash", kind: "transfer", transactionType: "CASH_WITHDRAWAL" },
  { id: "bank-transfer", label: "Bank Transfer", category: "Banking / Cash", kind: "transfer", transactionType: "BANK_TRANSFER" },
  { id: "cash-transfer", label: "Cash Transfer", category: "Banking / Cash", kind: "transfer", transactionType: "CASH_TRANSFER" },

  // Adjustments
  { id: "custom-entry", label: "Custom Entry", category: "Adjustments", kind: "customEntry" },
];

export const CATEGORIES = Array.from(new Set(TEMPLATES.map((t) => t.category)));
