import { and, desc, eq, gte, lte, ilike, or } from "drizzle-orm";
import { withErrorHandling, requireCompanyUserId } from "@/server/api/helpers";
import { db } from "@/server/db";
import { auditLogs, users } from "@/server/db/schema";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"]);
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 500);
    const userId = url.searchParams.get("userId");
    const entityType = url.searchParams.get("entityType");
    const action = url.searchParams.get("action");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const q = url.searchParams.get("q");

    const conditions = [eq(auditLogs.companyId, companyId)];
    if (userId) conditions.push(eq(auditLogs.userId, userId));
    if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
    if (action) conditions.push(eq(auditLogs.action, action));
    if (from) conditions.push(gte(auditLogs.createdAt, new Date(from)));
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(auditLogs.createdAt, toDate));
    }
    if (q) {
      conditions.push(
        or(ilike(auditLogs.action, `%${q}%`), ilike(auditLogs.entityType, `%${q}%`), ilike(auditLogs.entityId, `%${q}%`))!
      );
    }

    const rows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        previousValue: auditLogs.previousValue,
        newValue: auditLogs.newValue,
        createdAt: auditLogs.createdAt,
        userId: auditLogs.userId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    // Distinct filter option lists, so the UI can offer real choices for this company.
    const [distinctUsers, distinctActions, distinctEntityTypes] = await Promise.all([
      db
        .selectDistinct({ id: users.id, name: users.name, email: users.email })
        .from(auditLogs)
        .innerJoin(users, eq(users.id, auditLogs.userId))
        .where(eq(auditLogs.companyId, companyId)),
      db.selectDistinct({ action: auditLogs.action }).from(auditLogs).where(eq(auditLogs.companyId, companyId)),
      db.selectDistinct({ entityType: auditLogs.entityType }).from(auditLogs).where(eq(auditLogs.companyId, companyId)),
    ]);

    return {
      logs: rows,
      filters: {
        users: distinctUsers,
        actions: distinctActions.map((a) => a.action).sort(),
        entityTypes: distinctEntityTypes.map((e) => e.entityType).sort(),
      },
    };
  });
}
