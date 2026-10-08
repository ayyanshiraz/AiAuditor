export type TransactionType =
  | "PRODUCT_SALE"
  | "SERVICE_REVENUE"
  | "OTHER_INCOME"
  | "CUSTOMER_PAYMENT"
  | "SALARY"
  | "RENT"
  | "UTILITIES"
  | "OFFICE_EXPENSE"
  | "MARKETING"
  | "TRANSPORTATION"
  | "REPAIRS"
  | "PROFESSIONAL_FEES"
  | "INSURANCE"
  | "BANK_CHARGES"
  | "TAX_EXPENSE"
  | "OTHER_EXPENSE"
  | "RAW_MATERIAL_PURCHASE"
  | "INVENTORY_PURCHASE"
  | "OFFICE_SUPPLIES"
  | "EQUIPMENT_PURCHASE"
  | "ASSET_PURCHASE"
  | "ASSET_DISPOSAL"
  | "ASSET_TRANSFER"
  | "DEPRECIATION"
  | "LOAN_RECEIVED"
  | "LOAN_PAYMENT"
  | "SUPPLIER_PAYMENT"
  | "TAX_PAYABLE"
  | "OWNER_INVESTMENT"
  | "OWNER_DRAWINGS"
  | "CASH_DEPOSIT"
  | "CASH_WITHDRAWAL"
  | "BANK_TRANSFER"
  | "CASH_TRANSFER"
  | "MANUAL_JOURNAL"
  | "OPENING_BALANCE"
  | "CUSTOM_ENTRY"
  | "REVERSAL";

export type AccountType =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "COGS"
  | "EXPENSE";

export type NormalBalance = "DEBIT" | "CREDIT";

export type Role = "OWNER" | "ADMINISTRATOR" | "ACCOUNTANT" | "VIEWER";

export const ROLE_PERMISSIONS: Record<
  Role,
  { manageCompany: boolean; manageUsers: boolean; postEntries: boolean; viewReports: boolean; managePeriods: boolean }
> = {
  OWNER: { manageCompany: true, manageUsers: true, postEntries: true, viewReports: true, managePeriods: true },
  ADMINISTRATOR: { manageCompany: true, manageUsers: true, postEntries: true, viewReports: true, managePeriods: true },
  ACCOUNTANT: { manageCompany: false, manageUsers: false, postEntries: true, viewReports: true, managePeriods: false },
  VIEWER: { manageCompany: false, manageUsers: false, postEntries: false, viewReports: true, managePeriods: false },
};

export function can(role: Role, action: keyof (typeof ROLE_PERMISSIONS)["OWNER"]): boolean {
  return ROLE_PERMISSIONS[role]?.[action] ?? false;
}
