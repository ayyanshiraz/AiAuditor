import {
  pgTable,
  pgEnum,
  text,
  varchar,
  timestamp,
  numeric,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/*  ENUMS                                                              */
/* ------------------------------------------------------------------ */

export const roleEnum = pgEnum("role", [
  "OWNER",
  "ADMINISTRATOR",
  "ACCOUNTANT",
  "VIEWER",
]);

export const accountTypeEnum = pgEnum("account_type", [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "REVENUE",
  "COGS",
  "EXPENSE",
]);

export const normalBalanceEnum = pgEnum("normal_balance", ["DEBIT", "CREDIT"]);

export const journalStatusEnum = pgEnum("journal_status", [
  "DRAFT",
  "POSTED",
  "REVERSED",
  "VOIDED",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "PRODUCT_SALE",
  "SERVICE_REVENUE",
  "OTHER_INCOME",
  "CUSTOMER_PAYMENT",
  "SALARY",
  "RENT",
  "UTILITIES",
  "OFFICE_EXPENSE",
  "MARKETING",
  "TRANSPORTATION",
  "REPAIRS",
  "PROFESSIONAL_FEES",
  "INSURANCE",
  "BANK_CHARGES",
  "TAX_EXPENSE",
  "OTHER_EXPENSE",
  "RAW_MATERIAL_PURCHASE",
  "INVENTORY_PURCHASE",
  "OFFICE_SUPPLIES",
  "EQUIPMENT_PURCHASE",
  "ASSET_PURCHASE",
  "ASSET_DISPOSAL",
  "ASSET_TRANSFER",
  "DEPRECIATION",
  "LOAN_RECEIVED",
  "LOAN_PAYMENT",
  "SUPPLIER_PAYMENT",
  "TAX_PAYABLE",
  "OWNER_INVESTMENT",
  "OWNER_DRAWINGS",
  "CASH_DEPOSIT",
  "CASH_WITHDRAWAL",
  "BANK_TRANSFER",
  "CASH_TRANSFER",
  "MANUAL_JOURNAL",
  "OPENING_BALANCE",
  "CUSTOM_ENTRY",
  "REVERSAL",
]);

export const periodStatusEnum = pgEnum("period_status", [
  "OPEN",
  "CLOSED",
  "LOCKED",
]);

export const depreciationMethodEnum = pgEnum("depreciation_method", [
  "STRAIGHT_LINE",
  "NONE",
]);

export const assetStatusEnum = pgEnum("asset_status", [
  "ACTIVE",
  "DISPOSED",
  "SOLD",
  "TRANSFERRED",
]);

/* ------------------------------------------------------------------ */
/*  AUTH / USERS                                                       */
/* ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name"),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  // Platform-level (cross-tenant) controls — the software creator's control plane.
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  // True for accounts the platform owner provisions as tenant admins (they may own/create
  // companies). False for accounts created by invitation into a specific company (they can
  // only view/work within the company they were added to, never create their own).
  isAdmin: boolean("is_admin").notNull().default(false),
  maxCompanies: integer("max_companies"), // null = unlimited; caps how many companies this admin may own
  maxTeamMembers: integer("max_team_members"), // null = unlimited; caps total non-owner members across their companies
  createdByAdminId: text("created_by_admin_id"), // which superadmin created this account, if any
  disabledAt: timestamp("disabled_at"), // suspended by the creator — blocks login without deleting data
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accounts = pgTable(
  "auth_accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
);

export const sessions = pgTable("auth_sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "auth_verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/*  COMPANY / PORTFOLIO                                                 */
/* ------------------------------------------------------------------ */

export const companies = pgTable("companies", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  businessType: text("business_type"),
  registrationNumber: text("registration_number"),
  taxNumber: text("tax_number"),
  address: text("address"),
  country: text("country"),
  city: text("city"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  baseCurrency: text("base_currency").notNull().default("PKR"),
  // Per-company cap on non-owner members (null = unlimited). Snapshotted from the owning
  // admin's default at creation time; the platform owner can override it per company.
  maxTeamMembers: integer("max_team_members"),
  fiscalYearStartMonth: integer("fiscal_year_start_month").notNull().default(1),
  fiscalYearStartDay: integer("fiscal_year_start_day").notNull().default(1),
  accountingMethod: text("accounting_method").notNull().default("ACCRUAL"),
  cashAccountIds: jsonb("cash_account_ids").$type<string[]>().default([]),
  nextSequence: jsonb("next_sequence")
    .$type<Record<string, number>>()
    .default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  archivedAt: timestamp("archived_at"),
});

export const companyMembers = pgTable(
  "company_members",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("VIEWER"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("company_members_company_user_uq").on(t.companyId, t.userId),
    index("company_members_user_idx").on(t.userId),
  ]
);

/* ------------------------------------------------------------------ */
/*  ACCOUNTING PERIODS                                                  */
/* ------------------------------------------------------------------ */

export const accountingPeriods = pgTable(
  "accounting_periods",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startDate: timestamp("start_date", { mode: "date" }).notNull(),
    endDate: timestamp("end_date", { mode: "date" }).notNull(),
    status: periodStatusEnum("status").notNull().default("OPEN"),
    closedAt: timestamp("closed_at"),
    closedBy: text("closed_by").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("periods_company_idx").on(t.companyId, t.startDate)]
);

/* ------------------------------------------------------------------ */
/*  CHART OF ACCOUNTS                                                   */
/* ------------------------------------------------------------------ */

export const glAccounts = pgTable(
  "gl_accounts",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull(),
    subtype: text("subtype"),
    parentId: text("parent_id"),
    description: text("description"),
    normalBalance: normalBalanceEnum("normal_balance").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    isSystem: boolean("is_system").notNull().default(false),
    isCashOrBank: boolean("is_cash_or_bank").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("gl_accounts_company_code_uq").on(t.companyId, t.code),
    index("gl_accounts_company_type_idx").on(t.companyId, t.type),
  ]
);

/* ------------------------------------------------------------------ */
/*  JOURNAL ENTRIES / LINES                                             */
/* ------------------------------------------------------------------ */

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    entryNumber: text("entry_number").notNull(),
    entryDate: timestamp("entry_date", { mode: "date" }).notNull(),
    transactionType: transactionTypeEnum("transaction_type").notNull(),
    description: text("description").notNull(),
    reference: text("reference"),
    status: journalStatusEnum("status").notNull().default("DRAFT"),
    periodId: text("period_id").references(() => accountingPeriods.id),
    reversalOfId: text("reversal_of_id"),
    reversedById: text("reversed_by_id"),
    sourceType: text("source_type"),
    sourceId: text("source_id"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    postedBy: text("posted_by").references(() => users.id),
    postedAt: timestamp("posted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("journal_entries_company_number_uq").on(
      t.companyId,
      t.entryNumber
    ),
    index("journal_entries_company_date_idx").on(t.companyId, t.entryDate),
    index("journal_entries_company_status_idx").on(t.companyId, t.status),
    index("journal_entries_source_idx").on(t.sourceType, t.sourceId),
  ]
);

export const journalLines = pgTable(
  "journal_lines",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    journalEntryId: text("journal_entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    accountId: text("account_id")
      .notNull()
      .references(() => glAccounts.id),
    debit: numeric("debit", { precision: 18, scale: 2 }).notNull().default("0"),
    credit: numeric("credit", { precision: 18, scale: 2 })
      .notNull()
      .default("0"),
    description: text("description"),
    lineNumber: integer("line_number").notNull().default(1),
    customerId: text("customer_id"),
    supplierId: text("supplier_id"),
    employeeId: text("employee_id"),
    assetId: text("asset_id"),
    taxRateId: text("tax_rate_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("journal_lines_entry_idx").on(t.journalEntryId),
    index("journal_lines_account_idx").on(t.accountId),
    index("journal_lines_company_account_idx").on(t.companyId, t.accountId),
    index("journal_lines_customer_idx").on(t.customerId),
    index("journal_lines_supplier_idx").on(t.supplierId),
    index("journal_lines_employee_idx").on(t.employeeId),
    index("journal_lines_asset_idx").on(t.assetId),
  ]
);

/* ------------------------------------------------------------------ */
/*  CUSTOMERS / SUPPLIERS / EMPLOYEES                                   */
/* ------------------------------------------------------------------ */

export const customers = pgTable(
  "customers",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    company: text("company"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    taxNumber: text("tax_number"),
    openingBalance: numeric("opening_balance", { precision: 18, scale: 2 })
      .notNull()
      .default("0"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("customers_company_idx").on(t.companyId)]
);

export const suppliers = pgTable(
  "suppliers",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    company: text("company"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    taxNumber: text("tax_number"),
    openingBalance: numeric("opening_balance", { precision: 18, scale: 2 })
      .notNull()
      .default("0"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("suppliers_company_idx").on(t.companyId)]
);

export const employees = pgTable(
  "employees",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    employeeCode: text("employee_code").notNull(),
    name: text("name").notNull(),
    department: text("department"),
    position: text("position"),
    salary: numeric("salary", { precision: 18, scale: 2 }),
    joiningDate: timestamp("joining_date", { mode: "date" }),
    taxInfo: text("tax_info"),
    bankDetails: text("bank_details"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("employees_company_code_uq").on(t.companyId, t.employeeCode),
  ]
);

/* ------------------------------------------------------------------ */
/*  ASSETS                                                              */
/* ------------------------------------------------------------------ */

export const assets = pgTable(
  "assets",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    assetCode: text("asset_code").notNull(),
    name: text("name").notNull(),
    category: text("category"),
    purchaseDate: timestamp("purchase_date", { mode: "date" }).notNull(),
    purchaseValue: numeric("purchase_value", { precision: 18, scale: 2 }).notNull(),
    usefulLifeMonths: integer("useful_life_months").notNull(),
    depreciationMethod: depreciationMethodEnum("depreciation_method")
      .notNull()
      .default("STRAIGHT_LINE"),
    residualValue: numeric("residual_value", { precision: 18, scale: 2 })
      .notNull()
      .default("0"),
    location: text("location"),
    supplierId: text("supplier_id").references(() => suppliers.id),
    assetAccountId: text("asset_account_id")
      .notNull()
      .references(() => glAccounts.id),
    accumulatedDeprAccountId: text("accumulated_depr_account_id")
      .notNull()
      .references(() => glAccounts.id),
    depreciationExpenseAccountId: text("depreciation_expense_account_id")
      .notNull()
      .references(() => glAccounts.id),
    accumulatedDepreciation: numeric("accumulated_depreciation", {
      precision: 18,
      scale: 2,
    })
      .notNull()
      .default("0"),
    status: assetStatusEnum("status").notNull().default("ACTIVE"),
    disposalDate: timestamp("disposal_date", { mode: "date" }),
    disposalProceeds: numeric("disposal_proceeds", { precision: 18, scale: 2 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("assets_company_code_uq").on(t.companyId, t.assetCode),
    index("assets_company_idx").on(t.companyId),
  ]
);

/* ------------------------------------------------------------------ */
/*  TAXES                                                               */
/* ------------------------------------------------------------------ */

export const taxRates = pgTable(
  "tax_rates",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    rate: numeric("rate", { precision: 7, scale: 4 }).notNull(),
    taxType: text("tax_type").notNull(),
    taxAccountId: text("tax_account_id")
      .notNull()
      .references(() => glAccounts.id),
    effectiveDate: timestamp("effective_date", { mode: "date" }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("tax_rates_company_idx").on(t.companyId)]
);

/* ------------------------------------------------------------------ */
/*  ATTACHMENTS                                                         */
/* ------------------------------------------------------------------ */

export const attachments = pgTable(
  "attachments",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    journalEntryId: text("journal_entry_id").references(
      () => journalEntries.id,
      { onDelete: "cascade" }
    ),
    fileName: text("file_name").notNull(),
    fileType: text("file_type"),
    fileSize: integer("file_size"),
    storageKey: text("storage_key").notNull(),
    storageProvider: text("storage_provider").notNull().default("local"),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("attachments_entry_idx").on(t.journalEntryId)]
);

/* ------------------------------------------------------------------ */
/*  AUDIT LOG                                                            */
/* ------------------------------------------------------------------ */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: text("company_id").references(() => companies.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    previousValue: jsonb("previous_value"),
    newValue: jsonb("new_value"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_company_idx").on(t.companyId, t.createdAt),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
  ]
);

/* ------------------------------------------------------------------ */
/*  NOTIFICATIONS                                                       */
/* ------------------------------------------------------------------ */

export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: text("company_id").references(() => companies.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.isRead)]
);

/* ------------------------------------------------------------------ */
/*  RELATIONS                                                            */
/* ------------------------------------------------------------------ */

export const companiesRelations = relations(companies, ({ many }) => ({
  members: many(companyMembers),
  accounts: many(glAccounts),
  journalEntries: many(journalEntries),
  customers: many(customers),
  suppliers: many(suppliers),
  employees: many(employees),
  assets: many(assets),
  periods: many(accountingPeriods),
}));

export const journalEntriesRelations = relations(
  journalEntries,
  ({ many, one }) => ({
    lines: many(journalLines),
    company: one(companies, {
      fields: [journalEntries.companyId],
      references: [companies.id],
    }),
  })
);

export const journalLinesRelations = relations(journalLines, ({ one }) => ({
  entry: one(journalEntries, {
    fields: [journalLines.journalEntryId],
    references: [journalEntries.id],
  }),
  account: one(glAccounts, {
    fields: [journalLines.accountId],
    references: [glAccounts.id],
  }),
}));

export const glAccountsRelations = relations(glAccounts, ({ many }) => ({
  lines: many(journalLines),
}));
