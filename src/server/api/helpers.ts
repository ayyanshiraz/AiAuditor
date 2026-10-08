import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { AppError, ForbiddenError, toSafeError } from "@/lib/errors";
import { requireCompanyAccess } from "@/server/services/companies";
import type { Role } from "@/types/accounting";

export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) {
    throw new AppError("You must be signed in to do this.", { status: 401, code: "UNAUTHENTICATED" });
  }
  return id;
}

/** Returns {userId, isSuperAdmin} without requiring any company context. */
export async function requireUser(): Promise<{ userId: string; isSuperAdmin: boolean }> {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) {
    throw new AppError("You must be signed in to do this.", { status: 401, code: "UNAUTHENTICATED" });
  }
  const isSuperAdmin = Boolean((session?.user as { isSuperAdmin?: boolean } | undefined)?.isSuperAdmin);
  return { userId: id, isSuperAdmin };
}

/** Throws unless the signed-in user is the platform owner (creator). */
export async function requireSuperAdmin(): Promise<{ userId: string }> {
  const { userId, isSuperAdmin } = await requireUser();
  if (!isSuperAdmin) {
    throw new ForbiddenError("This area is restricted to the platform owner.");
  }
  return { userId };
}

/**
 * Checks company access for the given role requirement. The platform
 * owner (superadmin) always passes — they are not a member of every
 * company, but the creator portal promises full access everywhere, so
 * we grant it here rather than inserting them as a member row on every
 * tenant's company (which would pollute each company's member list).
 */
export async function requireCompanyUserId(companyId: string, allowedRoles?: Role[]) {
  const { userId, isSuperAdmin } = await requireUser();
  if (isSuperAdmin) {
    return { userId, role: "OWNER" as Role, isSuperAdmin: true };
  }
  const role = await requireCompanyAccess(companyId, userId, allowedRoles);
  return { userId, role, isSuperAdmin: false };
}

/** Wraps a route handler, converting thrown AppErrors (and unknown errors) into safe JSON responses. */
export function withErrorHandling<T>(fn: () => Promise<T>) {
  return fn().then(
    (data) => NextResponse.json(data ?? { ok: true }),
    (err) => {
      const safe = toSafeError(err);
      return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
    }
  );
}

export function requestMeta(req: Request) {
  return {
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  };
}
