import { z } from "zod";
import { withErrorHandling, requireSuperAdmin, requestMeta } from "@/server/api/helpers";
import { listAdmins, createAdminAccount } from "@/server/services/platform-admin";
import { logAudit } from "@/server/services/audit";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  maxCompanies: z.number().int().min(0).nullable().optional(),
  maxTeamMembers: z.number().int().min(0).nullable().optional(),
});

export async function GET() {
  return withErrorHandling(async () => {
    await requireSuperAdmin();
    const admins = await listAdmins();
    return { admins };
  });
}

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const { userId } = await requireSuperAdmin();
    const body = createSchema.parse(await req.json());
    const result = await createAdminAccount({ ...body, createdByAdminId: userId });
    await logAudit({
      userId,
      action: "ADMIN_ACCOUNT_CREATED",
      entityType: "User",
      entityId: result.user.id,
      newValue: { name: body.name, email: body.email, maxCompanies: body.maxCompanies, maxTeamMembers: body.maxTeamMembers },
      ...requestMeta(req),
    });
    return result;
  });
}
