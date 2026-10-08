import crypto from "node:crypto";
import { and, desc, eq, sql, ne, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import {
  users,
  companies,
  companyMembers,
  auditLogs,
} from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { NotFoundError, ValidationError } from "@/lib/errors";

/** Generates a readable-but-strong one-time password for a new/reset account. */
export function generateTempPassword(): string {
  // 4 groups of 4 alnum chars, e.g. "K3Qp-9zRt-Lm2X-4vBn" — easy to read aloud/retype.
  const group = () => crypto.randomBytes(4).toString("hex").slice(0, 4).toUpperCase();
  return `${group()}-${group()}-${group()}-${group()}`;
}

/** Platform-wide counts for the superadmin dashboard. */
export async function getPlatformOverview() {
  const [[{ admins }], [{ companiesCount }], [{ usersCount }], recentActivity] = await Promise.all([
    db
      .select({ admins: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.isSuperAdmin, false), eq(users.isAdmin, true))),
    db.select({ companiesCount: sql<number>`count(*)::int` }).from(companies),
    db.select({ usersCount: sql<number>`count(distinct ${companyMembers.userId})::int` }).from(companyMembers),
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        createdAt: auditLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
        companyName: companies.name,
        companyId: auditLogs.companyId,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .leftJoin(companies, eq(companies.id, auditLogs.companyId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(25),
  ]);

  return { admins, companies: companiesCount, users: usersCount, recentActivity };
}

/** Every tenant-admin account, with the companies they own (name + per-company user count) and their teammates. */
export async function listAdmins() {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      maxCompanies: users.maxCompanies,
      maxTeamMembers: users.maxTeamMembers,
      disabledAt: users.disabledAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.isSuperAdmin, false), eq(users.isAdmin, true)))
    .orderBy(desc(users.createdAt));

  const ownedCompanies = await db
    .select({
      ownerId: companyMembers.userId,
      companyId: companyMembers.companyId,
      companyName: companies.name,
    })
    .from(companyMembers)
    .innerJoin(companies, eq(companies.id, companyMembers.companyId))
    .where(eq(companyMembers.role, "OWNER"));

  const companiesByOwner = new Map<string, { id: string; name: string }[]>();
  for (const row of ownedCompanies) {
    const list = companiesByOwner.get(row.ownerId) ?? [];
    list.push({ id: row.companyId, name: row.companyName });
    companiesByOwner.set(row.ownerId, list);
  }

  const allOwnedCompanyIds = ownedCompanies.map((r) => r.companyId);
  const memberRows = allOwnedCompanyIds.length
    ? await db
        .select({
          companyId: companyMembers.companyId,
          companyName: companies.name,
          userId: users.id,
          name: users.name,
          email: users.email,
          role: companyMembers.role,
        })
        .from(companyMembers)
        .innerJoin(companies, eq(companies.id, companyMembers.companyId))
        .innerJoin(users, eq(users.id, companyMembers.userId))
        .where(and(inArray(companyMembers.companyId, allOwnedCompanyIds), ne(companyMembers.role, "OWNER")))
    : [];
  const membersByCompany = new Map<string, typeof memberRows>();
  for (const row of memberRows) {
    const list = membersByCompany.get(row.companyId) ?? [];
    list.push(row);
    membersByCompany.set(row.companyId, list);
  }

  const lastActivity = await db
    .select({ userId: auditLogs.userId, last: sql<Date>`max(${auditLogs.createdAt})` })
    .from(auditLogs)
    .groupBy(auditLogs.userId);
  const lastActivityByUser = new Map(lastActivity.map((r) => [r.userId, r.last]));

  return rows.map((u) => {
    const ownedCompaniesForUser = companiesByOwner.get(u.id) ?? [];
    const companiesWithMembers = ownedCompaniesForUser.map((c) => ({
      ...c,
      members: (membersByCompany.get(c.id) ?? []).map((m) => ({
        userId: m.userId,
        name: m.name,
        email: m.email,
        role: m.role,
      })),
    }));
    const teamMembers = companiesWithMembers.reduce((sum, c) => sum + c.members.length, 0);
    return {
      ...u,
      companiesOwned: ownedCompaniesForUser.length,
      companies: companiesWithMembers,
      teamMembers,
      lastActivity: lastActivityByUser.get(u.id) ?? null,
    };
  });
}

/** Every company on the platform, with its owner, member count, and contact details — for the superadmin's full company registry. */
export async function listAllCompaniesForSuperAdmin() {
  const rows = await db.select().from(companies).orderBy(desc(companies.createdAt));

  const owners = await db
    .select({
      companyId: companyMembers.companyId,
      ownerId: users.id,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(companyMembers)
    .innerJoin(users, eq(users.id, companyMembers.userId))
    .where(eq(companyMembers.role, "OWNER"));
  const ownerByCompany = new Map(owners.map((o) => [o.companyId, o]));

  const memberCounts = await db
    .select({ companyId: companyMembers.companyId, count: sql<number>`count(*)::int` })
    .from(companyMembers)
    .groupBy(companyMembers.companyId);
  const memberCountByCompany = new Map(memberCounts.map((m) => [m.companyId, m.count]));

  const lastActivityRows = await db
    .select({ companyId: auditLogs.companyId, last: sql<Date>`max(${auditLogs.createdAt})` })
    .from(auditLogs)
    .groupBy(auditLogs.companyId);
  const lastActivityByCompany = new Map(lastActivityRows.map((r) => [r.companyId, r.last]));

  return rows.map((c) => {
    const owner = ownerByCompany.get(c.id);
    return {
      id: c.id,
      name: c.name,
      legalName: c.legalName,
      businessType: c.businessType,
      registrationNumber: c.registrationNumber,
      taxNumber: c.taxNumber,
      address: c.address,
      country: c.country,
      city: c.city,
      phone: c.phone,
      email: c.email,
      website: c.website,
      baseCurrency: c.baseCurrency,
      maxTeamMembers: c.maxTeamMembers,
      memberCount: memberCountByCompany.get(c.id) ?? 0,
      ownerId: owner?.ownerId ?? null,
      ownerName: owner?.ownerName ?? null,
      ownerEmail: owner?.ownerEmail ?? null,
      lastActivity: lastActivityByCompany.get(c.id) ?? null,
      createdAt: c.createdAt,
      archivedAt: c.archivedAt,
    };
  });
}

/** Every user on the platform (admins and plain company members alike), with every company they belong to. */
export async function listAllUsersForSuperAdmin() {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isAdmin: users.isAdmin,
      isSuperAdmin: users.isSuperAdmin,
      disabledAt: users.disabledAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  const memberships = await db
    .select({
      userId: companyMembers.userId,
      companyId: companyMembers.companyId,
      companyName: companies.name,
      role: companyMembers.role,
    })
    .from(companyMembers)
    .innerJoin(companies, eq(companies.id, companyMembers.companyId));
  const membershipsByUser = new Map<string, typeof memberships>();
  for (const m of memberships) {
    const list = membershipsByUser.get(m.userId) ?? [];
    list.push(m);
    membershipsByUser.set(m.userId, list);
  }

  const lastActivity = await db
    .select({ userId: auditLogs.userId, last: sql<Date>`max(${auditLogs.createdAt})` })
    .from(auditLogs)
    .groupBy(auditLogs.userId);
  const lastActivityByUser = new Map(lastActivity.map((r) => [r.userId, r.last]));

  return rows.map((u) => ({
    ...u,
    companies: (membershipsByUser.get(u.id) ?? []).map((m) => ({
      companyId: m.companyId,
      companyName: m.companyName,
      role: m.role,
    })),
    lastActivity: lastActivityByUser.get(u.id) ?? null,
  }));
}

/** One admin's own info plus every company they own, with per-company member counts and last activity. */
export async function getAdminDetail(adminId: string) {
  const [admin] = await db.select().from(users).where(eq(users.id, adminId));
  if (!admin) throw new NotFoundError("Admin account");

  const owned = await db
    .select({ companyId: companyMembers.companyId })
    .from(companyMembers)
    .where(and(eq(companyMembers.userId, adminId), eq(companyMembers.role, "OWNER")));
  const companyIds = owned.map((o) => o.companyId);

  const companyRows = companyIds.length
    ? await db.select().from(companies).where(inArray(companies.id, companyIds))
    : [];

  const memberCounts = companyIds.length
    ? await db
        .select({ companyId: companyMembers.companyId, count: sql<number>`count(*)::int` })
        .from(companyMembers)
        .where(inArray(companyMembers.companyId, companyIds))
        .groupBy(companyMembers.companyId)
    : [];
  const memberCountByCompany = new Map(memberCounts.map((m) => [m.companyId, m.count]));

  const lastActivityRows = companyIds.length
    ? await db
        .select({ companyId: auditLogs.companyId, last: sql<Date>`max(${auditLogs.createdAt})` })
        .from(auditLogs)
        .where(inArray(auditLogs.companyId, companyIds))
        .groupBy(auditLogs.companyId)
    : [];
  const lastActivityByCompany = new Map(lastActivityRows.map((r) => [r.companyId, r.last]));

  return {
    admin: { id: admin.id, name: admin.name, email: admin.email, maxCompanies: admin.maxCompanies, maxTeamMembers: admin.maxTeamMembers, disabledAt: admin.disabledAt, createdAt: admin.createdAt },
    companies: companyRows.map((c) => ({
      id: c.id,
      name: c.name,
      baseCurrency: c.baseCurrency,
      maxTeamMembers: c.maxTeamMembers,
      archivedAt: c.archivedAt,
      createdAt: c.createdAt,
      memberCount: (memberCountByCompany.get(c.id) ?? 0) + 1, // +1 for the owner themselves
      lastActivity: lastActivityByCompany.get(c.id) ?? null,
    })),
  };
}

/** Every member of a company, each with their last recorded activity in that company. */
export async function listCompanyUsersForSuperAdmin(companyId: string) {
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
  if (!company) throw new NotFoundError("Company");

  const members = await db
    .select({
      membershipId: companyMembers.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      role: companyMembers.role,
      disabledAt: users.disabledAt,
      joinedAt: companyMembers.createdAt,
    })
    .from(companyMembers)
    .innerJoin(users, eq(users.id, companyMembers.userId))
    .where(eq(companyMembers.companyId, companyId));

  const lastActivity = await db
    .select({ userId: auditLogs.userId, last: sql<Date>`max(${auditLogs.createdAt})` })
    .from(auditLogs)
    .where(eq(auditLogs.companyId, companyId))
    .groupBy(auditLogs.userId);
  const lastActivityByUser = new Map(lastActivity.map((r) => [r.userId, r.last]));

  const owner = members.find((m) => m.role === "OWNER");

  return {
    company,
    owner: owner ? { id: owner.userId, name: owner.name, email: owner.email } : null,
    members: members.map((m) => ({ ...m, lastActivity: lastActivityByUser.get(m.userId) ?? null })),
  };
}

/** Creates a new admin account. Only callable by a superadmin (enforced at the route). */
export async function createAdminAccount(input: {
  name: string;
  email: string;
  password?: string;
  maxCompanies?: number | null;
  maxTeamMembers?: number | null;
  createdByAdminId: string;
}) {
  const email = input.email.toLowerCase().trim();
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) throw new ValidationError("An account with this email already exists.");

  const password = input.password && input.password.length >= 8 ? input.password : generateTempPassword();
  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      name: input.name,
      email,
      passwordHash,
      isAdmin: true,
      maxCompanies: input.maxCompanies ?? null,
      maxTeamMembers: input.maxTeamMembers ?? null,
      createdByAdminId: input.createdByAdminId,
    })
    .returning({ id: users.id, name: users.name, email: users.email });

  return { user, generatedPassword: password };
}

export async function updateAdminLimits(
  adminId: string,
  data: { maxCompanies?: number | null; maxTeamMembers?: number | null; name?: string }
) {
  const [updated] = await db
    .update(users)
    .set({
      ...(data.maxCompanies !== undefined ? { maxCompanies: data.maxCompanies } : {}),
      ...(data.maxTeamMembers !== undefined ? { maxTeamMembers: data.maxTeamMembers } : {}),
      ...(data.name !== undefined ? { name: data.name } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, adminId))
    .returning();
  if (!updated) throw new NotFoundError("Admin account");
  return updated;
}

export async function setUserDisabled(userId: string, disabled: boolean) {
  const [updated] = await db
    .update(users)
    .set({ disabledAt: disabled ? new Date() : null, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  if (!updated) throw new NotFoundError("User");
  return updated;
}

/** Sets (or generates) a new password for any user. Returns the plaintext once — it is never stored or logged. */
export async function resetUserPassword(userId: string, newPassword?: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new NotFoundError("User");

  const password = newPassword && newPassword.length >= 8 ? newPassword : generateTempPassword();
  const passwordHash = await hashPassword(password);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
  return { password };
}

/** Full company profile edit, available only to the platform owner (includes the member-limit override). */
export async function updateCompanyAsSuperAdmin(
  companyId: string,
  data: {
    name?: string;
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
    maxTeamMembers?: number | null;
    archivedAt?: Date | null;
  }
) {
  const [updated] = await db
    .update(companies)
    .set({ ...data, updatedAt: new Date() } as never)
    .where(eq(companies.id, companyId))
    .returning();
  if (!updated) throw new NotFoundError("Company");
  return updated;
}

function isForeignKeyViolation(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "23503");
}

/** Permanently deletes a company and everything under it (cascades through journals, accounts, members, etc). */
export async function deleteCompanyAsSuperAdmin(companyId: string) {
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
  if (!company) throw new NotFoundError("Company");
  try {
    await db.delete(companies).where(eq(companies.id, companyId));
    return { deleted: true };
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      throw new ValidationError(
        "This company couldn't be deleted because something still references it. Try again, or contact support."
      );
    }
    throw err;
  }
}

/**
 * Permanently deletes a user account. Succeeds for accounts with no
 * financial history (freshly created, mistaken, or never-used accounts).
 * For an account that has created/posted journal entries or uploaded
 * attachments, the database refuses the delete to protect that
 * provenance — use setUserDisabled() instead for those, which revokes
 * access immediately without touching any historical record.
 */
export async function deleteUserAccount(userId: string, opts?: { cascadeOwnedCompanies?: boolean }) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new NotFoundError("User");

  const owned = await db
    .select({ companyId: companyMembers.companyId })
    .from(companyMembers)
    .where(and(eq(companyMembers.userId, userId), eq(companyMembers.role, "OWNER")));

  if (owned.length > 0 && !opts?.cascadeOwnedCompanies) {
    throw new ValidationError(
      `This account owns ${owned.length} compan${owned.length === 1 ? "y" : "ies"}. Delete it with cascade confirmation to remove them too, or delete/reassign those companies first.`
    );
  }

  try {
    await db.transaction(async (tx) => {
      if (opts?.cascadeOwnedCompanies) {
        for (const o of owned) {
          await tx.delete(companies).where(eq(companies.id, o.companyId));
        }
      }
      await tx.delete(users).where(eq(users.id, userId));
    });
    return { deleted: true };
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      throw new ValidationError(
        "This account has created or posted accounting entries, so it can't be permanently deleted without losing that history. Disable the account instead to revoke access immediately."
      );
    }
    throw err;
  }
}

/** Removes a user from one company (not a full account delete). */
export async function removeUserFromCompany(companyId: string, userId: string) {
  await db
    .delete(companyMembers)
    .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, userId)));
  return { removed: true };
}
