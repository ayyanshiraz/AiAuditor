import { NextResponse } from "next/server";

/**
 * Public self-registration has been disabled. Accounts are provisioned
 * exclusively by the platform owner (superadmin portal) or by a company
 * admin inviting a teammate by email. This route is kept (instead of
 * deleted) so any stale client/bookmark gets a clear, safe response
 * instead of a confusing 404.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Self-service registration is disabled. Ask your company administrator to add you, or contact the platform owner.",
      code: "REGISTRATION_DISABLED",
    },
    { status: 403 }
  );
}
