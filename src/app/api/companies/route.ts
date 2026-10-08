import { z } from "zod";
import { withErrorHandling, requireUserId, requireUser } from "@/server/api/helpers";
import { createCompany, listCompaniesForUser, assertCanCreateCompany, assertIsAdminAccount } from "@/server/services/companies";

const createSchema = z.object({
  name: z.string().min(1),
  legalName: z.string().optional(),
  businessType: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
  baseCurrency: z.string().default("PKR"),
  fiscalYearStartMonth: z.number().int().min(1).max(12).default(1),
  fiscalYearStartDay: z.number().int().min(1).max(31).default(1),
  accountingMethod: z.string().default("ACCRUAL"),
});

export async function GET() {
  return withErrorHandling(async () => {
    const userId = await requireUserId();
    const companies = await listCompaniesForUser(userId);
    return { companies };
  });
}

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const { userId, isSuperAdmin } = await requireUser();
    const body = createSchema.parse(await req.json());
    await assertIsAdminAccount(userId, isSuperAdmin);
    await assertCanCreateCompany(userId);
    const company = await createCompany({ ownerId: userId, ...body });
    return { company };
  });
}
