import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { companies, companyMembers, auditLogs, users } from "@/server/db/schema";
import { createDefaultChartOfAccounts } from "./chart-of-accounts";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import type { Role } from "@/types/accounting";

/** Throws if this user (an admin, not the platform owner) has hit their company limit. */
export async function assertCanCreateCompany(ownerId: string) {
  const [owner] = await db.select().from(users).where(eq(users.id, ownerId));
  if (!owner || owner.maxCompanies == null) return; // unlimited (or superadmin / not found — caller already auth'd)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(companyMembers)
    .where(and(eq(companyMembers.userId, ownerId), eq(companyMembers.role, "OWNER")));

  if (count >= owner.maxCompanies) {
    throw new ValidationError(
      `You've reached your limit of ${owner.maxCompanies} compan${owner.maxCompanies === 1 ? "y" : "ies"}. Contact the platform owner to raise it.`
    );
  }
}

/**
 * Throws unless this account is allowed to create companies: the platform owner
 * (superadmin), or a tenant admin account (provisioned by the platform owner).
 * A plain user who was only ever invited into someone else's company cannot
 * create companies of their own — they can view and work within the company
 * they were added to, nothing more.
 */
export async function assertIsAdminAccount(userId: string, isSuperAdmin: boolean) {
  if (isSuperAdmin) return;
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !user.isAdmin) {
    throw new ForbiddenError(
      "Only admin accounts can create companies. Ask the platform owner for an admin account, or ask your company's admin to add you where you need access."
    );
  }
}

/** Throws if adding one more non-owner member to this company would exceed its own member limit. */
export async function assertCanAddTeamMember(companyId: string) {
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
  if (!company || company.maxTeamMembers == null) return; // unlimited

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(companyMembers)
    .where(and(eq(companyMembers.companyId, companyId), ne(companyMembers.role, "OWNER")));

  if (count >= company.maxTeamMembers) {
    throw new ValidationError(
      `This company has reached its limit of ${company.maxTeamMembers} team member${company.maxTeamMembers === 1 ? "" : "s"}. Contact the platform owner to raise it.`
    );
  }
}

export interface CreateCompanyInput {
  ownerId: string;
  name: string;
  legalName?: string;
  businessType?: string;
  registrationNumber?: string;
  taxNumber?: string;
  address?: string;
  country?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  baseCurrency?: string;
  fiscalYearStartMonth?: number;
  fiscalYearStartDay?: number;
  accountingMethod?: string;
  /** Per-company member cap. If omitted, snapshots the owner's platform-wide default. */
  maxTeamMembers?: number | null;
}

export async function createCompany(input: CreateCompanyInput) {
  return db.transaction(async (tx) => {
    const [owner] = await tx.select().from(users).where(eq(users.id, input.ownerId));
    const maxTeamMembers = input.maxTeamMembers !== undefined ? input.maxTeamMembers : (owner?.maxTeamMembers ?? null);

    const [company] = await tx
      .insert(companies)
      .values({
        name: input.name,
        legalName: input.legalName,
        businessType: input.businessType,
        registrationNumber: input.registrationNumber,
        taxNumber: input.taxNumber,
        address: input.address,
        country: input.country,
        city: input.city,
        phone: input.phone,
        email: input.email,
        website: input.website,
        baseCurrency: input.baseCurrency ?? "PKR",
        fiscalYearStartMonth: input.fiscalYearStartMonth ?? 1,
        fiscalYearStartDay: input.fiscalYearStartDay ?? 1,
        accountingMethod: input.accountingMethod ?? "ACCRUAL",
        maxTeamMembers,
      })
      .returning();

    await tx.insert(companyMembers).values({
      companyId: company.id,
      userId: input.ownerId,
      role: "OWNER",
    });

    await createDefaultChartOfAccounts(tx, company.id);

    // Mark the default cash & bank accounts as designated cash accounts
    // for cash-flow classification (already set via isCashOrBank flag in
    // the default chart, so nothing further required here).

    await tx.insert(auditLogs).values({
      companyId: company.id,
      userId: input.ownerId,
      action: "COMPANY_CREATED",
      entityType: "Company",
      entityId: company.id,
      newValue: { name: company.name },
    });

    return company;
  });
}

export async function listCompaniesForUser(userId: string) {
  const rows = await db
    .select({ company: companies, role: companyMembers.role })
    .from(companyMembers)
    .innerJoin(companies, eq(companies.id, companyMembers.companyId))
    .where(eq(companyMembers.userId, userId));

  return rows
    .filter((r) => !r.company.archivedAt)
    .map((r) => ({ ...r.company, role: r.role as Role }));
}

export async function getCompanyMembership(companyId: string, userId: string) {
  const [row] = await db
    .select()
    .from(companyMembers)
    .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, userId)));
  return row;
}

/** Throws if the user is not a member of the company, or lacks the given role(s). */
export async function requireCompanyAccess(
  companyId: string,
  userId: string,
  allowedRoles?: Role[]
): Promise<Role> {
  const membership = await getCompanyMembership(companyId, userId);
  if (!membership) {
    throw new ForbiddenError("You do not have access to this company.");
  }
  if (allowedRoles && !allowedRoles.includes(membership.role as Role)) {
    throw new ForbiddenError("Your role does not permit this action.");
  }
  return membership.role as Role;
}

export async function getCompany(companyId: string) {
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
  if (!company) throw new NotFoundError("Company");
  return company;
}

export async function updateCompany(
  companyId: string,
  data: Partial<CreateCompanyInput> & { archivedAt?: Date | null }
) {
  const [updated] = await db
    .update(companies)
    .set({ ...data, updatedAt: new Date() } as never)
    .where(eq(companies.id, companyId))
    .returning();
  return updated;
}

export async function listCompanyMembers(companyId: string) {
  const { users } = await import("@/server/db/schema");
  return db
    .select({
      id: companyMembers.id,
      userId: companyMembers.userId,
      role: companyMembers.role,
      name: users.name,
      email: users.email,
    })
    .from(companyMembers)
    .innerJoin(users, eq(users.id, companyMembers.userId))
    .where(eq(companyMembers.companyId, companyId));
}

export async function inviteOrSetMemberRole(companyId: string, userId: string, role: Role) {
  const existing = await getCompanyMembership(companyId, userId);
  if (existing) {
    const [updated] = await db
      .update(companyMembers)
      .set({ role })
      .where(eq(companyMembers.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db.insert(companyMembers).values({ companyId, userId, role }).returning();
  return created;
}
