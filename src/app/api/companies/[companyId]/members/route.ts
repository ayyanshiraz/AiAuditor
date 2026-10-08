import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { withErrorHandling, requireCompanyUserId } from "@/server/api/helpers";
import { listCompanyMembers, inviteOrSetMemberRole, getCompanyMembership, assertCanAddTeamMember } from "@/server/services/companies";
import { generateTempPassword } from "@/server/services/platform-admin";
import { hashPassword } from "@/server/auth/password";
import { createNotification } from "@/server/services/notifications";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["OWNER", "ADMINISTRATOR", "ACCOUNTANT", "VIEWER"]),
  // Required when inviting someone with no existing account — the inviting admin sets
  // the new teammate's initial password directly rather than it being auto-generated.
  password: z.string().min(8).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    await requireCompanyUserId(companyId);
    const members = await listCompanyMembers(companyId);
    return { members };
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR"]);
    const body = inviteSchema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    let [user] = await db.select().from(users).where(eq(users.email, email));
    let generatedPassword: string | undefined;
    const existing = user ? await getCompanyMembership(companyId, user.id) : null;

    if (!existing) {
      // New to this company (new account, or an existing user being added here for the first time).
      await assertCanAddTeamMember(companyId);
    }

    if (!user) {
      // Self-registration is disabled — admins provision teammates directly, and set
      // the teammate's initial password themselves (falling back to a generated one
      // only if none was supplied).
      const password = body.password ?? generateTempPassword();
      if (!body.password) generatedPassword = password;
      const passwordHash = await hashPassword(password);
      [user] = await db
        .insert(users)
        .values({ name: email.split("@")[0], email, passwordHash })
        .returning();
    }

    const member = await inviteOrSetMemberRole(companyId, user.id, body.role);

    await createNotification({
      companyId,
      userId: user.id,
      type: existing ? "PERMISSION_CHANGED" : "USER_INVITED",
      title: existing ? "Your role was changed" : "You were added to a company",
      message: existing
        ? `Your role has been updated to ${body.role}.`
        : `You've been added with the role ${body.role}.`,
    });

    return { member, generatedPassword };
  });
}
