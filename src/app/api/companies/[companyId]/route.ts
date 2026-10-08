import { z } from "zod";
import { withErrorHandling, requireCompanyUserId } from "@/server/api/helpers";
import { getCompany, updateCompany } from "@/server/services/companies";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  legalName: z.string().optional(),
  businessType: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  baseCurrency: z.string().optional(),
  fiscalYearStartMonth: z.number().int().min(1).max(12).optional(),
  fiscalYearStartDay: z.number().int().min(1).max(31).optional(),
  accountingMethod: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    const { role } = await requireCompanyUserId(companyId);
    const company = await getCompany(companyId);
    return { company, role };
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR"]);
    const body = updateSchema.parse(await req.json());
    const company = await updateCompany(companyId, body);
    return { company };
  });
}
