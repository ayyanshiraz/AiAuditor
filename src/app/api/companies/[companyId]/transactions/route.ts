import { z } from "zod";
import { withErrorHandling, requireCompanyUserId } from "@/server/api/helpers";
import {
  recordSale,
  recordCustomerPayment,
  recordExpense,
  recordSalaryPayment,
  recordPurchase,
  recordSupplierPayment,
  recordLoanReceived,
  recordLoanPayment,
  recordOwnerInvestment,
  recordOwnerDrawings,
  recordTransfer,
  recordTaxPayment,
  recordCustomEntry,
} from "@/server/services/transactions";
import { ValidationError } from "@/lib/errors";

const base = {
  date: z.coerce.date(),
  description: z.string().min(1),
  reference: z.string().optional(),
  autoPost: z.boolean().optional(),
};

const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("sale"),
    ...base,
    amount: z.number().positive(),
    isCredit: z.boolean(),
    paymentAccountId: z.string().optional(),
    revenueAccountId: z.string().optional(),
    receivableAccountId: z.string().optional(),
    customerId: z.string().optional(),
    taxRateId: z.string().optional(),
    taxAccountId: z.string().optional(),
    taxAmount: z.number().optional(),
    transactionType: z.enum(["PRODUCT_SALE", "SERVICE_REVENUE", "OTHER_INCOME"]).optional(),
  }),
  z.object({
    kind: z.literal("customerPayment"),
    ...base,
    amount: z.number().positive(),
    paymentAccountId: z.string(),
    receivableAccountId: z.string().optional(),
    customerId: z.string(),
  }),
  z.object({
    kind: z.literal("expense"),
    ...base,
    amount: z.number().positive(),
    expenseAccountId: z.string(),
    paymentAccountId: z.string(),
    isCredit: z.boolean().optional(),
    payableAccountId: z.string().optional(),
    supplierId: z.string().optional(),
    employeeId: z.string().optional(),
    taxAmount: z.number().optional(),
    taxAccountId: z.string().optional(),
    taxRateId: z.string().optional(),
    transactionType: z.string(),
  }),
  z.object({
    kind: z.literal("salary"),
    ...base,
    employeeId: z.string(),
    grossSalary: z.number().positive(),
    providentFundEmployee: z.number().min(0).optional(),
    providentFundEmployer: z.number().min(0).optional(),
    gratuityAccrual: z.number().min(0).optional(),
    taxWithheld: z.number().min(0).optional(),
    otherDeductions: z.number().min(0).optional(),
    netAmount: z.number().min(0).optional(),
    salaryExpenseAccountId: z.string().optional(),
    paymentAccountId: z.string(),
  }),
  z.object({
    kind: z.literal("purchase"),
    ...base,
    amount: z.number().positive(),
    purchaseAccountId: z.string(),
    isCredit: z.boolean(),
    paymentAccountId: z.string().optional(),
    payableAccountId: z.string().optional(),
    supplierId: z.string().optional(),
    taxAmount: z.number().optional(),
    taxAccountId: z.string().optional(),
    taxRateId: z.string().optional(),
    transactionType: z.enum([
      "RAW_MATERIAL_PURCHASE",
      "INVENTORY_PURCHASE",
      "OFFICE_SUPPLIES",
      "EQUIPMENT_PURCHASE",
    ]),
  }),
  z.object({
    kind: z.literal("supplierPayment"),
    ...base,
    amount: z.number().positive(),
    paymentAccountId: z.string(),
    payableAccountId: z.string().optional(),
    supplierId: z.string(),
  }),
  z.object({
    kind: z.literal("loanReceived"),
    ...base,
    amount: z.number().positive(),
    cashAccountId: z.string(),
    loanAccountId: z.string().optional(),
  }),
  z.object({
    kind: z.literal("loanPayment"),
    ...base,
    principalAmount: z.number().positive(),
    interestAmount: z.number().optional(),
    interestExpenseAccountId: z.string().optional(),
    cashAccountId: z.string(),
    loanAccountId: z.string().optional(),
  }),
  z.object({
    kind: z.literal("ownerInvestment"),
    ...base,
    amount: z.number().positive(),
    cashAccountId: z.string(),
    capitalAccountId: z.string().optional(),
  }),
  z.object({
    kind: z.literal("ownerDrawings"),
    ...base,
    amount: z.number().positive(),
    cashAccountId: z.string(),
    drawingsAccountId: z.string().optional(),
  }),
  z.object({
    kind: z.literal("transfer"),
    ...base,
    amount: z.number().positive(),
    fromAccountId: z.string(),
    toAccountId: z.string(),
    transactionType: z.enum(["CASH_DEPOSIT", "CASH_WITHDRAWAL", "BANK_TRANSFER", "CASH_TRANSFER"]).optional(),
  }),
  z.object({
    kind: z.literal("taxPayment"),
    ...base,
    amount: z.number().positive(),
    taxPayableAccountId: z.string().optional(),
    paymentAccountId: z.string(),
  }),
  z.object({
    kind: z.literal("customEntry"),
    ...base,
    accountId: z.string(),
    paymentAccountId: z.string(),
    amount: z.number().positive(),
    isDebitToAccount: z.boolean(),
    taxAmount: z.number().optional(),
    taxAccountId: z.string().optional(),
    customerId: z.string().optional(),
    supplierId: z.string().optional(),
  }),
]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"]);
    const body = schema.parse(await req.json());
    const common = { companyId, date: body.date, description: body.description, reference: body.reference, createdBy: userId, autoPost: body.autoPost };

    switch (body.kind) {
      case "sale":
        return { entry: await recordSale({ ...common, ...body }) };
      case "customerPayment":
        return { entry: await recordCustomerPayment({ ...common, ...body }) };
      case "expense":
        return { entry: await recordExpense({ ...common, ...body, transactionType: body.transactionType as never }) };
      case "salary":
        return { entry: await recordSalaryPayment({ ...common, ...body }) };
      case "purchase":
        return { entry: await recordPurchase({ ...common, ...body }) };
      case "supplierPayment":
        return { entry: await recordSupplierPayment({ ...common, ...body }) };
      case "loanReceived":
        return { entry: await recordLoanReceived({ ...common, ...body }) };
      case "loanPayment":
        return { entry: await recordLoanPayment({ ...common, ...body }) };
      case "ownerInvestment":
        return { entry: await recordOwnerInvestment({ ...common, ...body }) };
      case "ownerDrawings":
        return { entry: await recordOwnerDrawings({ ...common, ...body }) };
      case "transfer":
        return { entry: await recordTransfer({ ...common, ...body }) };
      case "taxPayment":
        return { entry: await recordTaxPayment({ ...common, ...body }) };
      case "customEntry":
        return { entry: await recordCustomEntry({ ...common, ...body }) };
      default:
        throw new ValidationError("Unknown transaction kind.");
    }
  });
}
