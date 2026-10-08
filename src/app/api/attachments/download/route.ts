import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { attachments } from "@/server/db/schema";
import { requireCompanyUserId, requireUserId } from "@/server/api/helpers";
import { readFile } from "@/server/services/storage";
import { toSafeError } from "@/lib/errors";

/**
 * Serves a locally-stored attachment's bytes. Only reachable when
 * STORAGE_PROVIDER=local — an S3-backed deployment instead gets a signed
 * URL directly from the storage provider (see getFileUrl in storage.ts),
 * so this route never needs to proxy S3 traffic itself.
 */
export async function GET(req: Request) {
  try {
    await requireUserId();
    const url = new URL(req.url);
    const key = url.searchParams.get("key");
    if (!key) {
      return new Response("Missing key", { status: 400 });
    }

    const [row] = await db.select().from(attachments).where(eq(attachments.storageKey, key));
    if (!row) {
      return new Response("Not found", { status: 404 });
    }
    // Enforce the same company-membership check every other read uses —
    // the storage key alone must never be sufficient to read the file.
    await requireCompanyUserId(row.companyId);

    const buffer = await readFile(row.storageKey, row.storageProvider);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": row.fileType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${row.fileName.replace(/"/g, "")}"`,
      },
    });
  } catch (err) {
    const safe = toSafeError(err);
    return new Response(safe.message, { status: safe.status });
  }
}
