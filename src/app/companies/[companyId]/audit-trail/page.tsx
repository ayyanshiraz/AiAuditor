import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { auditLogs, users } from "@/server/db/schema";
import { AuditTrailClient } from "./audit-trail-client";

export default async function AuditTrailPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;

  const [logs, distinctUsers, distinctActions, distinctEntityTypes] = await Promise.all([
    db
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
      .where(eq(auditLogs.companyId, companyId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(200),
    db
      .selectDistinct({ id: users.id, name: users.name, email: users.email })
      .from(auditLogs)
      .innerJoin(users, eq(users.id, auditLogs.userId))
      .where(eq(auditLogs.companyId, companyId)),
    db.selectDistinct({ action: auditLogs.action }).from(auditLogs).where(eq(auditLogs.companyId, companyId)),
    db.selectDistinct({ entityType: auditLogs.entityType }).from(auditLogs).where(eq(auditLogs.companyId, companyId)),
  ]);

  return (
    <AuditTrailClient
      companyId={companyId}
      initial={{
        logs: logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
        filters: {
          users: distinctUsers,
          actions: distinctActions.map((a) => a.action).sort(),
          entityTypes: distinctEntityTypes.map((e) => e.entityType).sort(),
        },
      }}
    />
  );
}
