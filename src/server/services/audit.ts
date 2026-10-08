import { db, type DbOrTx } from "@/server/db";
import { auditLogs } from "@/server/db/schema";

export interface LogAuditInput {
  companyId?: string; // absent for platform-level (superadmin) actions with no single company
  userId?: string; // absent when the acting user's own account is being deleted
  action: string;
  entityType: string;
  entityId?: string;
  previousValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Records one entry in the company's activity/audit log. Used for every
 * create/edit/delete on master data (employees, customers, suppliers,
 * accounts, assets, tax rates) so the Audit Trail page shows a complete
 * picture of who changed what, not just posted journal entries.
 */
export async function logAudit(input: LogAuditInput, tx?: DbOrTx) {
  const client = tx ?? db;
  await client.insert(auditLogs).values({
    companyId: input.companyId,
    userId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    previousValue: input.previousValue as never,
    newValue: input.newValue as never,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
}
