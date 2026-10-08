import { z } from "zod";
import { withErrorHandling, requireSuperAdmin, requestMeta } from "@/server/api/helpers";
import {
  listCompanyUsersForSuperAdmin,
  deleteCompanyAsSuperAdmin,
  updateCompanyAsSuperAdmin,
} from "@/server/services/platform-admin";
import { logAudit } from "@/server/services/audit";

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
  maxTeamMembers: z.number().int().min(0).nullable().optional(),
  archived: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    await requireSuperAdmin();
    const { companyId } = await params;
    return listCompanyUsersForSuperAdmin(companyId);
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { userId } = await requireSuperAdmin();
    const { companyId } = await params;
    const body = updateSchema.parse(await req.json());
    const { archived, ...rest } = body;
    const company = await updateCompanyAsSuperAdmin(companyId, {
      ...rest,
      ...(archived !== undefined ? { archivedAt: archived ? new Date() : null } : {}),
    });
    await logAudit({
      userId,
      companyId,
      action: "COMPANY_UPDATED_BY_PLATFORM_OWNER",
      entityType: "Company",
      entityId: companyId,
      newValue: body,
      ...requestMeta(req),
    });
    return { company };
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { userId } = await requireSuperAdmin();
    const { companyId } = await params;
    const result = await deleteCompanyAsSuperAdmin(companyId);
    await logAudit({
      userId,
      action: "COMPANY_DELETED_BY_PLATFORM_OWNER",
      entityType: "Company",
      entityId: companyId,
      ...requestMeta(req),
    });
    return result;
  });
}
